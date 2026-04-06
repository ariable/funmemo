# FunMemo - 中文会议纪要工作台

FunMemo 是一个基于 AI 的中文会议纪要平台，支持音频上传、语音转录、发言人标注、智能纪要生成与导出。

## 功能特性

- **语音转录** — 基于 FunASR 的高精度中文语音识别，支持说话人分离
- **发言人标注** — 自动识别发言人，支持手动修正姓名和角色
- **智能纪要** — 调用大语言模型 (LLM) 自动生成会议纪要，支持 Markdown 和 JSON 结构化两种格式
- **任务流管理** — 完整的任务状态流转：上传 → 转录 → 标注 → 生成纪要 → 导出
- **后台工作器** — 自动轮询处理长时任务，支持断点恢复
- **全中文界面** — 简体中文 UI，适配桌面与移动端

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 前端 | React 19, Tailwind CSS 4 |
| 数据库 | SQLite + Prisma 7 |
| 语音识别 | FunASR API |
| 纪要生成 | OpenAI 兼容 LLM API |
| 语言 | TypeScript 5 |

## 快速开始

### 前置要求

- Node.js 20+
- FunASR API 服务（默认 `http://127.0.0.1:17003`）
- OpenAI 兼容的 LLM API 服务

### 安装与运行

```bash
# 安装依赖
npm install

# 初始化数据库
npm run db:generate
npm run db:push

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可使用。

### 生产部署

```bash
npm run build
npm start
```

## 配置说明

配置通过**环境变量**或**设置页面** (`/settings`) 管理，两者效果等价。

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FUNASR_API_BASE_URL` | FunASR API 地址 | `http://127.0.0.1:17003` |
| `FUNASR_API_TOKEN` | FunASR API 令牌（可选） | — |
| `FUNASR_MODEL` | 语音识别模型 | `qwen3-asr` |
| `LLM_API_BASE_URL` | LLM API 地址 | — |
| `LLM_API_KEY` | LLM API 密钥 | — |
| `LLM_MODEL` | LLM 模型名称 | — |
| `STORAGE_ROOT` | 文件存储目录 | `./storage` |
| `DATABASE_URL` | 数据库连接地址 | `file:./dev.db` |

### Web 端设置

启动后访问 `/settings` 页面，可在线配置以上参数并即时生效（写入数据库 `AppConfig` 表）。

## 使用流程

### 1. 上传音频

在首页上传会议录音文件（最大 2 GB），可填写会议标题和日期。

### 2. 语音转录

系统自动调用 FunASR 进行语音识别和说话人分离，生成带时间戳的逐句转录。

### 3. 发言人标注

进入 `/jobs/{jobId}/annotation` 页面，修正发言人的姓名和角色。保存后会自动更新标注转录文本。

### 4. 生成纪要

进入 `/jobs/{jobId}/summary` 页面，选择输出格式后生成纪要：

- **Markdown** — 自由格式的会议纪要文档
- **JSON 结构化** — 包含参会人、议题、结论、行动项、风险等字段

### 5. 导出预览

在 `/jobs/{jobId}/export` 页面查看和下载最终结果。

## 项目结构

```
src/
├── app/                    # Next.js 页面与 Server Actions
│   ├── page.tsx            # 首页（任务列表 + 上传）
│   ├── actions.ts          # 服务端操作
│   ├── settings/           # 设置页
│   └── jobs/[jobId]/       # 任务详情页
│       ├── annotation/     # 发言人标注
│       ├── summary/        # 纪要生成
│       └── export/         # 导出预览
├── components/             # React 组件
├── lib/                    # 工具库
│   ├── types.ts            # 类型定义
│   ├── prisma.ts           # Prisma 客户端
│   └── server/             # 服务端逻辑
│       ├── config.ts       # 配置管理
│       ├── funasr.ts       # FunASR 客户端
│       ├── summary.ts      # 纪要生成 & Prompt
│       ├── storage.ts      # 文件存储
│       └── transcript.ts   # 转录处理
├── worker/                 # 后台工作器
│   ├── runner.ts           # 轮询调度
│   └── handlers/           # 任务处理器
└── instrumentation.ts      # 工作器启动入口

prisma/
└── schema.prisma           # 数据库 Schema

storage/                    # 文件存储（运行时生成）
└── jobs/{jobId}/
    ├── source/             # 原始音频
    ├── transcript/         # 转录文件
    ├── summary/            # 纪要文件
    └── exports/            # 导出文件
```

## 数据库管理

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送 Schema 到数据库
npm run db:push

# 打开 Prisma Studio（可视化管理）
npm run db:studio
```

## 任务状态流

```
queued → transcribing → transcript_ready → speaker_editing → summarizing → summary_ready → completed
                                                                                        ↘ failed
```

## 许可证

MIT
