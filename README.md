# 工时追踪系统 (Effort Tracker)

基于 Bun + React + shadcn/ui + SQLite 的轻量级团队工时管理工具，支持自然语言录入工时，自动汇总为 Markdown 报告。

## 快速启动

```bash
# 1. 安装依赖
bun install

# 2. 启动后端 API（端口 3001）
bun run server/index.ts

# 3. 新开终端，启动前端（端口 5173）
bun x vite
```

访问 [http://localhost:5173](http://localhost:5173)

> 如果端口被占用：`lsof -ti :3001 | xargs kill -9`

---

## 功能介绍

### 自然语言录入工时
直接用中文描述工作内容，系统自动解析为结构化字段：

```
张伟今天在电商平台重构上花了3小时做联调测试
李娜昨天参与AI智能助手项目，投入了2.5小时做Prompt优化
王芳 推荐引擎优化 4小时 特征工程开发
陈强2025年1月8日在供应链管理系统做接口开发，用了5h
```

解析字段：**姓名 · 项目（模糊匹配）· 工时 · 日期 · 备注**，显示置信度，可手动调整后确认提交。

### 双项目线管理
| 类型 | 标识 | 说明 |
|------|------|------|
| 业务项目 | 🔵 蓝色 | 日常业务系统迭代、改造类项目 |
| 创新项目 | 🟣 紫色 | 技术探索、AI、低代码等创新类项目 |

### 项目看板
- 完成度进度条
- DDL 预警（7 天内橙色高亮，逾期红色标注）
- 状态管理（进行中 / 已完成 / 已暂停）
- 成员参与人数 & 累计工时

### Recharts 图表
- 业务 vs 创新工时占比饼图
- 各项目工时投入横向柱状图
- 人员工时堆叠柱状图
- 日期维度工时趋势面积图

### Markdown 汇总报告
按时间区间一键生成包含以下内容的报告：
- 业务 / 创新项目各自总工时及占比
- 每个项目的完成度、DDL、参与人员
- 人员工时分布表格

支持在线预览和一键下载 `.md` 文件。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 运行时 | [Bun](https://bun.sh) 1.x |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| UI 组件库 | shadcn/ui + Radix UI |
| 样式 | Tailwind CSS |
| 图表 | Recharts |
| 数据库 | SQLite（`bun:sqlite` 内置驱动） |
| HTTP 服务 | `Bun.serve()` |

---

## 项目结构

```
ET/
├── server/                 # 后端
│   ├── index.ts            # HTTP 服务入口
│   ├── db.ts               # SQLite 初始化 + Mock 数据
│   ├── nlp.ts              # 自然语言解析器
│   └── routes/
│       ├── projects.ts     # 项目 CRUD
│       ├── worklogs.ts     # 工时记录 + NLP 解析接口
│       └── summary.ts      # Markdown 报告生成
│
├── src/                    # 前端
│   ├── App.tsx             # 主布局 + 导航
│   ├── main.tsx
│   ├── components/
│   │   ├── NLPInput.tsx    # 自然语言输入框
│   │   ├── StatsCards.tsx  # 统计卡片
│   │   ├── Charts.tsx      # Recharts 图表
│   │   ├── ProjectList.tsx # 项目列表 + CRUD 弹窗
│   │   ├── WorkLogTable.tsx# 工时记录表格
│   │   ├── SummaryView.tsx # 报告生成 + Markdown 预览
│   │   └── ui/             # shadcn/ui 基础组件
│   ├── hooks/
│   │   ├── useApi.ts       # 封装 fetch + useGet
│   │   └── use-toast.ts    # Toast 通知
│   ├── types/index.ts      # TypeScript 类型定义
│   ├── lib/utils.ts        # 工具函数
│   └── styles/globals.css  # Tailwind + CSS 变量
│
├── data/                   # SQLite 数据库文件（运行时生成）
│   └── effort.db
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取所有项目（含工时汇总） |
| POST | `/api/projects` | 创建项目 |
| PATCH | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |
| GET | `/api/worklogs` | 获取工时记录（支持筛选） |
| POST | `/api/worklogs` | 新增工时记录 |
| POST | `/api/worklogs/parse` | 自然语言解析（不入库） |
| DELETE | `/api/worklogs/:id` | 删除工时记录 |
| GET | `/api/worklogs/stats` | 统计数据（图表用） |
| GET | `/api/summary` | 生成 Markdown 报告 |

---

## Mock 数据说明

首次运行时自动写入 8 个项目（4 业务 + 4 创新）和 35 条工时记录，涵盖 8 位虚拟同事，可直接体验完整功能。

如需重置数据，删除 `data/effort.db` 后重启服务即可。
