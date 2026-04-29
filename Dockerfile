# ────────────────────────────────────────────
# Stage 1: 构建前端静态资源
# ────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# 只拷贝依赖清单，利用 Docker 层缓存
COPY package.json ./
RUN bun install

# 拷贝源码并构建
COPY . .
RUN bun run build

# ────────────────────────────────────────────
# Stage 2: 生产运行镜像（最小化体积）
# ────────────────────────────────────────────
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# 服务端只用 bun:sqlite / Bun.serve 等内置模块，无需 node_modules
# 从构建阶段复制前端产物
COPY --from=builder /app/dist ./dist

# 复制服务端源码（Bun 直接运行 TS，无需编译）
COPY server ./server

# 创建数据目录（SQLite 持久化卷挂载点）
RUN mkdir -p /app/data

# 非 root 用户运行，提升安全性
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/projects || exit 1

CMD ["bun", "run", "server/index.ts"]
