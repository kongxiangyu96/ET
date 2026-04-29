# 阿里云企业内网部署指南

本文档描述将 Effort Tracker 部署到阿里云 ECS，满足企业内网访问合规要求的完整方案。

## 架构概览

```
企业内网用户
    │
    │ (VPC 内网 / VPN 专线 / 云企业网)
    ▼
[SLB 内网型负载均衡]   ← 不绑定公网 EIP，仅内网访问
    │
    ▼
[ECS 实例]
  ├── Docker 容器: effort-tracker (端口 3001)
  │     ├── 前端静态资源 (React/Vite dist)
  │     └── Bun API 服务
  └── 本地磁盘 / NAS: /app/data/effort.db
```

**合规关键点**：
- SLB 使用「内网型」，无公网 IP，数据不出 VPC
- ECS 安全组仅开放 VPC 内网 CIDR 访问
- SQLite 数据文件留在阿里云 VPC 内部
- 镜像通过阿里云 ACR（私有镜像仓库）分发，不走公网

---

## 前置要求

| 资源 | 规格建议 | 说明 |
|------|----------|------|
| ECS | 2核4G，CentOS 8 / Alibaba Cloud Linux 3 | 运行 Docker |
| VPC | 已有企业 VPC | 与其他内网系统互通 |
| 交换机 | 目标可用区下的私有子网 | ECS 所在子网 |
| ACR | 个人版或企业版均可 | 私有镜像仓库 |
| NAS（可选） | NFS 协议 | 多实例共享 SQLite 时使用 |

---

## 一、ECS 环境准备

```bash
# 1. 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker

# 2. 配置阿里云镜像加速（换源，提升拉取速度）
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["https://<你的加速地址>.mirror.aliyuncs.com"],
  "log-driver": "json-file",
  "log-opts": { "max-size": "100m", "max-file": "3" }
}
EOF
sudo systemctl daemon-reload && sudo systemctl restart docker

# 3. 创建数据目录
sudo mkdir -p /data/effort-tracker
sudo chown 1000:1000 /data/effort-tracker
```

---

## 二、配置 ACR 私有镜像仓库

```bash
# 在阿里云控制台创建命名空间和仓库后，本地登录 ACR
docker login --username=<RAM用户> registry.cn-hangzhou.aliyuncs.com

# 在开发机上构建并推送镜像
docker build -t effort-tracker:latest .
docker tag effort-tracker:latest registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest
docker push registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest
```

> 将 `cn-hangzhou` 替换为你实际使用的 Region（如 `cn-shanghai`、`cn-beijing`）

---

## 三、ECS 上拉取并运行容器

```bash
# 1. 登录 ACR（ECS 上执行）
docker login --username=<RAM用户> registry.cn-hangzhou.aliyuncs.com

# 2. 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest

# 3. 运行容器（仅监听 127.0.0.1，通过 SLB 或 Nginx 对内网暴露）
docker run -d \
  --name effort-tracker \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v /data/effort-tracker:/app/data \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e CORS_ORIGIN="http://your-intranet-domain.corp" \
  registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest
```

---

## 四、Nginx 反向代理（推荐）

在 ECS 上运行 Nginx 作为统一入口，便于后续加 HTTPS、访问日志、Basic Auth 等。

```bash
sudo yum install -y nginx
```

`/etc/nginx/conf.d/effort-tracker.conf`：

```nginx
server {
    listen 80;
    server_name effort-tracker.corp.example.com;  # 内网域名

    # 访问日志（审计用）
    access_log /var/log/nginx/effort-tracker-access.log;
    error_log  /var/log/nginx/effort-tracker-error.log;

    # 限制只允许 VPC 内网段访问（按实际网段修改）
    allow 10.0.0.0/8;
    allow 172.16.0.0/12;
    deny all;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;

        # SSE / 长连接支持（汇总报告用到流式响应时需要）
        proxy_buffering    off;
        proxy_read_timeout 300s;
    }
}
```

```bash
sudo nginx -t && sudo systemctl enable --now nginx
```

---

## 五、安全组规则配置

在阿里云 ECS 安全组中，**入方向**只保留以下规则：

| 优先级 | 协议 | 端口 | 授权对象 | 说明 |
|--------|------|------|----------|------|
| 1 | TCP | 80 | VPC 内网 CIDR（如 10.0.0.0/8） | 内网 HTTP |
| 2 | TCP | 22 | 运维跳板机 IP | SSH 管理 |
| 100 | ALL | ALL | 拒绝 | 默认拒绝其他 |

> **不开放任何公网入方向规则**，ECS 不绑定公网 EIP。

---

## 六、SQLite 数据持久化方案

### 方案 A：ECS 本地磁盘（单实例，推荐）

- 数据目录：`/data/effort-tracker/effort.db`
- 通过 Docker volume 挂载 `-v /data/effort-tracker:/app/data`
- 备份：配置定时任务，将 `.db` 文件上传到 OSS（内网 VPC Endpoint）

```bash
# 定时备份到 OSS（crontab）
# 安装 ossutil：https://help.aliyun.com/document_detail/120075.html
0 2 * * * ossutil cp /data/effort-tracker/effort.db oss://your-bucket/backup/effort-$(date +\%Y\%m\%d).db --endpoint oss-cn-hangzhou-internal.aliyuncs.com
```

### 方案 B：NAS 挂载（多实例 / 高可用）

```bash
# 挂载阿里云 NAS（NFS）
sudo mount -t nfs -o vers=4,minorversion=0,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport \
  <NAS挂载点>.cn-hangzhou.nas.aliyuncs.com:/ /data/effort-tracker
```

> 注意：SQLite 在 NAS/NFS 上有并发写锁问题，仅适合单写多读场景。

---

## 七、内网 DNS 配置（可选）

在阿里云 VPC 的 PrivateZone 中添加解析记录：

```
effort-tracker.corp.example.com  A  <ECS 内网 IP>
```

企业用户无需记 IP，直接访问域名。

---

## 八、镜像更新流程

```bash
# 开发机：构建新镜像并推送
docker build -t effort-tracker:v1.1.0 .
docker tag effort-tracker:v1.1.0 registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest
docker push registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest

# ECS：拉取新镜像并滚动重启（数据不丢失）
docker pull registry.cn-hangzhou.aliyuncs.com/<命名空间>/effort-tracker:latest
docker stop effort-tracker && docker rm effort-tracker
docker run -d \   # 同第三步的 run 命令
  ...
```

---

## 九、合规检查清单

- [ ] ECS 无公网 EIP，安全组无公网入站规则
- [ ] 镜像存储在 ACR 私有仓库，非 Docker Hub
- [ ] SQLite 数据文件存储在 VPC 内部（ECS 本地盘或 NAS）
- [ ] OSS 备份使用 VPC 内网 Endpoint（`oss-cn-*-internal.aliyuncs.com`）
- [ ] Nginx 访问日志开启，满足操作审计要求
- [ ] ACR 登录使用 RAM 子账号，最小权限原则
- [ ] SSH 端口仅对跳板机 IP 开放
- [ ] `CORS_ORIGIN` 锁定为内网域名，不使用通配符 `*`
