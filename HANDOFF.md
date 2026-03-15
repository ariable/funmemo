# FunMemo Handoff

## 1. 当前范围

当前已在仓库根目录下新建独立项目：

- [funmemo](/root/funmemo/funmemo)

明确边界：

- `funasr-api/` 子目录未修改
- `MeetMemo/` 子目录未修改
- 新实现全部在 `funmemo/` 内


## 2. 已完成内容

### 2.1 基础工程

- 已创建 `Next.js 16 + TypeScript + Tailwind + Prisma + SQLite` 项目
- 已切换为中文界面
- 已移除 Google 字体依赖，避免构建时网络问题
- 已将 `build` 改为 `next build --webpack`

关键文件：

- [package.json](/root/funmemo/funmemo/package.json)
- [layout.tsx](/root/funmemo/funmemo/src/app/layout.tsx)
- [globals.css](/root/funmemo/funmemo/src/app/globals.css)
- [next.config.ts](/root/funmemo/funmemo/next.config.ts)


### 2.2 数据层

- 已落 `Prisma schema`
- 已使用 SQLite
- 已 `db push`
- 已 `prisma generate`

当前数据库模型包括：

- `Job`
- `JobFile`
- `SpeakerProfile`
- `Summary`
- `Download`
- `JobEvent`
- `AppConfig`

关键文件：

- [schema.prisma](/root/funmemo/funmemo/prisma/schema.prisma)
- [prisma.config.ts](/root/funmemo/funmemo/prisma.config.ts)
- [prisma.ts](/root/funmemo/funmemo/src/lib/prisma.ts)


### 2.3 真实转录接入

- 上传音频后会真实写入 `storage/jobs/{jobId}/source/`
- 会真实调用 `funasr-api /v1/audio/transcriptions`
- 使用 `verbose_json + enable_speaker_diarization + word_timestamps`
- 会落盘：
  - `transcript/transcript.raw.json`
  - `transcript/transcript.annotated.json`
- 会把发言人信息写入 `SpeakerProfile`

上传时当前可填写的会议基础信息：

- 会议标题
- 会议时间

关键文件：

- [actions.ts](/root/funmemo/funmemo/src/app/actions.ts)
- [storage.ts](/root/funmemo/funmemo/src/lib/server/storage.ts)
- [funasr.ts](/root/funmemo/funmemo/src/lib/server/funasr.ts)
- [transcript.ts](/root/funmemo/funmemo/src/lib/server/transcript.ts)


### 2.4 发言人修正

- 已支持在任务详情页编辑说话人：
  - 姓名
  - 职务
- 保存后会：
  - 更新 `SpeakerProfile`
  - 重写 `transcript.annotated.json`
  - 删除旧 summary 记录

关键文件：

- [speaker-editor.tsx](/root/funmemo/funmemo/src/components/speaker-editor.tsx)
- [actions.ts](/root/funmemo/funmemo/src/app/actions.ts)


### 2.5 中文纪要生成

- 已参考 `MeetMemo` 的 summary 逻辑
- 已按中文会议场景做 prompt 优化
- 生成时优先强调：
  - 会议概述
  - 关键结论
  - 风险与分歧
  - 待办事项
- 已要求：
  - 只基于 transcript 输出
  - 不得臆造结论/负责人/截止时间
  - 保留 transcript 中真实姓名/职务

关键文件：

- [summary.ts](/root/funmemo/funmemo/src/lib/server/summary.ts)
- [actions.ts](/root/funmemo/funmemo/src/app/actions.ts)

参考来源：

- `/root/funmemo/MeetMemo/backend/services/summary_service.py`


### 2.6 前端页面

已完成页面：

- `/`
- `/jobs/[jobId]`
- `/settings`

页面特点：

- 中文界面
- 简洁现代的工作台视觉
- 首页支持上传
- 首页上传表单已包含会议基础信息填写
- 首页展示最近任务
- 任务详情支持查看真实 transcript、编辑发言人、生成纪要
- 设置页支持保存服务地址与模型配置

关键文件：

- [page.tsx](/root/funmemo/funmemo/src/app/page.tsx)
- [page.tsx](/root/funmemo/funmemo/src/app/jobs/[jobId]/page.tsx)
- [page.tsx](/root/funmemo/funmemo/src/app/settings/page.tsx)
- [job-detail-client.tsx](/root/funmemo/funmemo/src/components/job-detail-client.tsx)
- [recent-jobs.tsx](/root/funmemo/funmemo/src/components/recent-jobs.tsx)
- [upload-form.tsx](/root/funmemo/funmemo/src/components/upload-form.tsx)
- [summary-actions.tsx](/root/funmemo/funmemo/src/components/summary-actions.tsx)
- [settings-form.tsx](/root/funmemo/funmemo/src/components/settings-form.tsx)


### 2.7 设置页

已完成 `/settings` 页面，当前可填写并保存：

- 转录 API 地址
- 转录 Token
- 转录模型
- LLM API 地址
- LLM API Key
- LLM 模型

设置持久化方式：

- 保存到 SQLite 的 `AppConfig`

运行时读取策略：

- 转录优先读 `AppConfig`
- 纪要生成优先读 `AppConfig`
- 若数据库中无值，则回退到环境变量默认值

关键文件：

- [config.ts](/root/funmemo/funmemo/src/lib/server/config.ts)
- [settings.ts](/root/funmemo/funmemo/src/pages/api/settings.ts)
- [settings-page-client.tsx](/root/funmemo/funmemo/src/components/settings-page-client.tsx)
- [settings-form.tsx](/root/funmemo/funmemo/src/components/settings-form.tsx)


### 2.8 当前读取方式

为了绕开 `Next.js 16` 在 `app/api` 动态路由上的构建问题，当前读取型接口放在 `pages/api`：

- `/api/jobs-list`
- `/api/job-detail`
- `/api/settings`

写操作当前使用 `server actions`：

- 上传任务
- 保存发言人
- 生成纪要
- 保存设置

关键文件：

- [jobs-list.ts](/root/funmemo/funmemo/src/pages/api/jobs-list.ts)
- [job-detail.ts](/root/funmemo/funmemo/src/pages/api/job-detail.ts)
- [settings.ts](/root/funmemo/funmemo/src/pages/api/settings.ts)
- [actions.ts](/root/funmemo/funmemo/src/app/actions.ts)


## 3. 已验证内容

已通过：

- `DATABASE_URL="file:./dev.db" npm run db:push`
- `DATABASE_URL="file:./dev.db" npm run db:generate`
- `npm run lint`
- `npm run build`

注意：

- 单独运行 `npx tsc --noEmit` 可能会因为 `.next/types` 的 include 行为报缺文件，这不代表 `next build` 失败


## 4. 当前没做的内容

以下内容还没有完成：

### 4.1 任务执行方式

- 目前上传后会在请求里同步执行转录
- 还没有真正的后台 worker / queue
- 长音频可能阻塞请求


### 4.2 设置页能力不足

- 还没有“测试连接”按钮
- 还没有分别测试：
  - FunASR API 可达性
  - LLM API 可达性
- 还没有配置校验逻辑
- 还没有隐藏/脱敏显示已保存的 key/token 的策略


### 4.3 纪要能力不足

- 还没有“手工编辑纪要”
- 还没有“重新生成纪要时自定义 prompt”
- 还没有纪要版本管理
- 还没有 markdown 编辑器


### 4.4 导出能力未做

- 未实现导出 markdown
- 未实现导出 transcript JSON
- 未实现导出 PDF / DOCX
- 未实现 downloads 记录落库逻辑


### 4.5 上传与任务管理不足

- 还没有任务删除
- 还没有失败重试
- 还没有分页
- 还没有搜索/筛选
- 还没有上传进度展示
- 会议基础信息目前只落了标题和会议时间，其他字段未扩展


### 4.6 认证与权限未做

- 无登录
- 无鉴权
- 无多用户隔离


### 4.7 生产化能力不足

- 没有后台 job runner
- 没有更细的错误分类
- 没有 observability / audit 完整链路
- 没有自动清理旧文件


## 5. 当前实现的几个重要事实

### 5.1 详情页不再服务端直读数据库

当前 `/jobs/[jobId]` 页面本身只挂载客户端组件：

- 真正取详情走 `/api/job-detail`

这样做的原因：

- 避开 `Next.js 16` 全量 build 时对动态页面 page-data 收集的不稳定问题


### 5.2 首页最近任务不再服务端直读数据库

当前首页任务列表通过：

- `/api/jobs-list`

来读取

原因同上：

- 保持 build 稳定


### 5.3 设置页也改成客户端取数

当前 `/settings` 页面通过：

- `/api/settings`

获取配置

原因同上：

- 避免 build 阶段直接触发数据库读取导致 page-data 收集失败


### 5.4 写操作都是真实写入

尽管读取用了 `pages/api` 和客户端请求，以下写操作都是真实的：

- 上传音频
- 调用 FunASR 转录
- 写文件到 `storage/jobs`
- 写 speaker 修正到 SQLite 和 annotated transcript
- 调用 LLM 生成纪要
- 保存系统设置到 SQLite


## 6. 当前环境变量

参考文件：

- [.env.example](/root/funmemo/funmemo/.env.example)

但注意：

- 现在“转录 API 地址 / LLM API 地址 / 模型 / token / key”优先从数据库设置读取
- 环境变量主要作为默认回退值


## 7. 建议下一步

优先级建议如下：

1. 增加 `/settings` 的“测试连接”按钮
2. 将上传后的同步转录改成真正后台 job / worker
3. 增加纪要手工编辑能力
4. 增加导出能力
5. 增加任务重试与失败恢复


## 8. 后续接手时需要注意

- 不要修改 `funasr-api/` 子目录，除非用户明确要求
- `MeetMemo/` 目前只作为参考来源，不是运行时依赖
- 如果继续扩展 API，优先评估 `Next.js 16` 下 `app/api` 的构建行为
- 当前为了稳定构建，读取接口刻意放在 `pages/api`
- 当前 repo 根目录的 `PLAN.md` 已更新为“只保留姓名 + 职务”的方案
