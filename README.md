# Effort Tracker

A lightweight team work-hours management tool built with Bun, React, shadcn/ui, and SQLite. Supports natural language input, voice dictation, file import (Excel/Markdown), and direct form entry — with automatic Markdown report generation and i18n support (Chinese, English, German).

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the backend API (port 3001)
bun run server/index.ts

# 3. In a new terminal, start the frontend (port 5173)
bun x vite
```

Or run both concurrently:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

> If a port is in use: `lsof -ti :3001 | xargs kill -9`

---

## Docker 部署

### 本地构建与运行

```bash
# 构建镜像
docker build -t effort-tracker .

# 启动（数据持久化到 ./data 目录）
docker compose up -d
```

访问 [http://localhost:3001](http://localhost:3001)

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务监听端口 |
| `NODE_ENV` | `production` | 运行模式 |
| `CORS_ORIGIN` | `*` | 允许的 CORS 来源，生产环境建议锁定为具体域名 |

### 数据持久化

SQLite 数据库文件位于容器内 `/app/data/effort.db`，通过 Docker volume 挂载到宿主机：

```bash
# docker-compose.yml 已配置，数据目录为项目根目录下的 ./data
# 手动备份
cp ./data/effort.db ./data/effort-backup-$(date +%Y%m%d).db
```

### 阿里云企业内网部署

详见 [docs/deploy-aliyun-intranet.md](docs/deploy-aliyun-intranet.md)，涵盖：

- ECS + VPC 内网隔离配置
- ACR 私有镜像仓库推送流程
- Nginx 反向代理 + IP 白名单
- 安全组规则（无公网入站）
- SQLite 定时备份到 OSS（内网 Endpoint）
- 合规检查清单

---

## Features

### Four Work Log Entry Modes

The input panel offers three collapsible accordion cards (Form is expanded by default):

| Mode | Description |
|------|-------------|
| **Form Input** | Fill in fields directly — name, project, hours, date, notes |
| **Natural Language + Voice** | Type or dictate a sentence; the system parses it into structured fields with a confidence score |
| **Import File** | Upload `.xlsx`, `.xls`, or `.md` — preview parsed rows, then batch submit |

### Voice Dictation
- Uses the browser's native Web Speech API (no extra dependency)
- Microphone button in the NLP textarea; language automatically matches the current UI locale (`zh-CN` / `en-US` / `de-DE`)

### Excel / Markdown Import
- Download a pre-formatted Excel template from the import card
- Drag-and-drop or click to upload
- Preview table with per-row match status before submitting
- Rows with unrecognised project names are flagged individually

### i18n — Chinese / English / German
- Language switcher in the sidebar (中 / EN / DE)
- All UI strings, toast messages, placeholders, and badges are fully translated
- Selected language is persisted in `localStorage`

### Dual Project Track
| Track | Color | Description |
|-------|-------|-------------|
| Business | Blue | Day-to-day business system development |
| Innovation | Purple | Tech exploration, AI, low-code, and R&D projects |

### Project Board
- Completion progress bar
- Deadline warnings (orange ≤ 7 days, red when overdue)
- Status management (Active / Completed / Paused)
- Participant count and cumulative hours per project

### Charts (Recharts)
- Business vs. innovation hours pie chart
- Per-project hours horizontal bar chart
- Per-colleague stacked bar chart
- Daily hours area trend chart

### Markdown Summary Report
Generate a report for any date range with one click:
- Total hours by track with percentage breakdown
- Per-project completion, deadline, and participants
- Colleague hours distribution table

Preview inline and download as a `.md` file.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh) 1.x |
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Database | SQLite (`bun:sqlite` built-in driver) |
| HTTP Server | `Bun.serve()` |
| i18n | i18next + react-i18next |
| File Parsing | SheetJS (xlsx) |

---

## Project Structure

```
ET/
├── server/                   # Backend
│   ├── index.ts              # HTTP server entry
│   ├── db.ts                 # SQLite init + mock data
│   ├── nlp.ts                # Natural language parser
│   └── routes/
│       ├── projects.ts       # Project CRUD
│       ├── worklogs.ts       # Work logs, NLP parse, batch import
│       └── summary.ts        # Markdown report generation
│
├── src/                      # Frontend
│   ├── App.tsx               # Main layout + navigation
│   ├── main.tsx
│   ├── i18n/
│   │   ├── index.ts          # i18next initialisation
│   │   ├── zh.json           # Chinese translations
│   │   ├── en.json           # English translations
│   │   └── de.json           # German translations
│   ├── components/
│   │   ├── FormInput.tsx     # Direct form entry
│   │   ├── NLPInput.tsx      # Natural language + voice input
│   │   ├── ImportWorklogCard.tsx  # Excel / Markdown import
│   │   ├── StatsCards.tsx    # Stats summary cards
│   │   ├── Charts.tsx        # Recharts visualisations
│   │   ├── ProjectList.tsx   # Project list + CRUD dialog
│   │   ├── WorkLogTable.tsx  # Work log table with search
│   │   ├── SummaryView.tsx   # Report generation + Markdown preview
│   │   └── ui/               # shadcn/ui base components
│   ├── hooks/
│   │   ├── useApi.ts         # fetch wrapper + useGet
│   │   └── use-toast.ts      # Toast notifications
│   ├── types/index.ts        # TypeScript type definitions
│   ├── lib/utils.ts          # Utility functions
│   └── styles/globals.css    # Tailwind + CSS variables
│
├── data/                     # SQLite database (created at runtime, Docker volume mount point)
│   └── effort.db
│
├── docs/
│   └── deploy-aliyun-intranet.md  # 阿里云内网部署指南
│
├── Dockerfile                # Multi-stage build (Vite build → Bun runner)
├── docker-compose.yml        # Local testing / single-host deployment
├── .dockerignore
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects (with aggregated hours) |
| POST | `/api/projects` | Create a project |
| PATCH | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |
| GET | `/api/worklogs` | List work logs (filterable) |
| POST | `/api/worklogs` | Create a work log entry |
| POST | `/api/worklogs/parse` | Parse natural language (does not persist) |
| POST | `/api/worklogs/batch` | Batch import work logs |
| DELETE | `/api/worklogs/:id` | Delete a work log entry |
| GET | `/api/worklogs/stats` | Aggregated stats (used by charts) |
| GET | `/api/summary` | Generate Markdown report |

---

## Mock Data

On first run, 8 projects (4 business + 4 innovation) and 35 work log entries across 8 virtual colleagues are seeded automatically so you can explore all features immediately.

To reset, delete `data/effort.db` and restart the server.
