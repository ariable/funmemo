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
| `APP_URL` | 应用外部访问地址 | `http://localhost:3000` |
| `AUTH_SECRET` | 本地登录会话签名密钥 | — |
| `AUTH_SESSION_MAX_AGE_SEC` | 本地会话有效期（秒） | `604800` |
| `AUTH_CASDOOR_ISSUER` | Casdoor OIDC Issuer 地址 | — |
| `AUTH_CASDOOR_ID` | Casdoor Application Client ID | — |
| `AUTH_CASDOOR_SECRET` | Casdoor Application Client Secret | — |
| `AUTH_CASDOOR_SCOPE` | Casdoor OAuth scope | `openid profile email` |
| `AUTH_LOGIN_URL` | 自定义登录入口（可选，默认使用应用内 Casdoor 登录） | — |
| `AUTH_LOGIN_RETURN_TO_PARAM` | 统一登录入口使用的回跳参数名 | `returnTo` |
| `AUTH_USER_ID_HEADER` | 可选：上游代理注入的用户 ID 请求头回退值 | `x-user-id` |
| `AUTH_USER_NAME_HEADER` | 可选：上游代理注入的用户展示名请求头回退值 | `x-user-name` |
| `AUTH_USER_LOGIN_HEADER` | 可选：上游代理注入的登录名请求头回退值 | `x-user-login` |

### Web 端设置

启动后访问 `/settings` 页面，可在线配置以上参数并即时生效（写入数据库 `AppConfig` 表）。

## 登录与用户隔离

当前实现已经支持：

- 应用内直接接入 Casdoor OIDC 登录
- 静默登录（Silent Login）与失败回退普通登录
- 本地签名会话 Cookie
- 按用户隔离任务与日志

同时也保留了“上游代理注入用户头”的回退能力，方便你部署在已有网关后面。

### 当前身份字段

系统当前优先使用本地登录会话；如果部署在已有认证代理后，也可以从请求头里回退读取以下字段：

- `x-user-id`：用户唯一 ID，用于权限判断和任务归属
- `x-user-name`：用户展示名，用于右上角显示和日志记录
- `x-user-login`：登录名/邮箱，用于展示名缺失时回退

如果你有自己的网关或认证代理，也可以通过环境变量修改这些头名。

### 当前权限行为

- 新建任务时会写入 `userId`
- 历史任务列表只返回当前用户自己的任务
- 任务详情、标注、生成纪要、删除、导出都按 `userId` 校验
- 上传日志和下载日志会记录 `userId`、展示名、IP、User-Agent
- 删除任务不会删除上传日志，便于后续统计

### Casdoor 接入说明

当前仓库已经内置 Casdoor 登录路由：

- `/api/auth/sign-in/casdoor`
- `/api/auth/callback/casdoor`
- `/api/auth/logout`

### Silent Login 与失败回退

当前已经实现了静默登录状态机：

1. 未登录访问受保护页面时，自动跳转到应用内 Casdoor 登录入口
2. 第一次跳转会附带 `silentSignin=1`
3. 如果静默登录后回到页面时仍未登录，系统会自动回退到普通登录
4. 如果普通登录回来后仍没有用户身份，则停止跳转并显示登录提示，避免死循环

默认情况下，系统会使用：

```text
/api/auth/sign-in/casdoor?attempt=silent&returnTo=...
```

如果你要替换成自己的统一登录入口，也可以设置：

```text
AUTH_LOGIN_URL=http://192.168.43.249:3210/api/auth/sign-in/casdoor
AUTH_LOGIN_RETURN_TO_PARAM=returnTo
```

此时静默登录首跳会类似于：

```text
http://192.168.43.249:3210/api/auth/sign-in/casdoor?attempt=silent&silentSignin=1&returnTo=http%3A%2F%2F192.168.43.249%3A3210%2F%3FauthAttempt%3Dsilent
```

### Casdoor 配置

按你给的配置，应用内直连 Casdoor 时：

- 应用地址：`http://192.168.43.249:3210`
- Casdoor Issuer：`http://192.168.43.249:8910`

常见的 Casdoor 回调地址应填写：

```text
http://192.168.43.249:3210/api/auth/callback/casdoor
```

如果你还要支持本机开发，也建议一并加入：

```text
http://localhost:3210/api/auth/callback/casdoor
```

如果你准备把 FunMemo 直接接入 Casdoor，而不是走上游代理，那么 Casdoor Application 建议至少配置：

- Redirect URIs
  - `http://192.168.43.249:3210/api/auth/callback/casdoor`
  - `http://localhost:3210/api/auth/callback/casdoor`
- Home URL
  - `http://192.168.43.249:3210/`
- Auto Sign-In
  - 开启

如果需要登出回调，通常也会配：

```text
http://192.168.43.249:3210/
http://localhost:3210/
```

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

## 测试

```bash
# 运行测试
npm test

# 运行静态检查
npm run lint
```

当前已覆盖：

- 上传日志字段构造与 IP 解析
- 删除任务后上传日志仍然保留
- 用户头解析
- 本地会话 token 编解码
- 静默登录与普通登录回退 URL 构造
- 基于 `userId` 的任务隔离查询

## 任务状态流

```
queued → transcribing → transcript_ready → speaker_editing → summarizing → summary_ready → completed
                                                                                        ↘ failed
```

## 许可证

MIT
