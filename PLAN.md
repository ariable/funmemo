# FunMemo 方案设计

## 1. 目标

FunMemo 是一个基于 `funasr-api` 的会议纪要系统。

约束如下：

- `funasr-api` 作为底层 ASR 服务，尽量不修改其现有实现
- 保持 `funasr-api` 的 OpenAI 兼容定位不变
- 新系统需要支持长任务、页面关闭后恢复、历史任务查看
- 需要支持说话人姓名和部门修正
- 需要支持会议纪要生成、查看、编辑和下载

建议架构：

- `funasr-api`：底层转录和说话人分离服务
- `funmemo`：新的全栈业务系统，使用 `Next.js`


## 2. 总体架构

### 2.1 服务分层

1. `funasr-api`
- 提供 OpenAI 兼容转录接口
- 提供说话人分离结果
- 不承载任务编排、历史记录、纪要工作流

2. `funmemo`
- 提供正式前端界面
- 提供业务 API
- 维护任务状态
- 管理 SQLite 和文件存储
- 调用 `funasr-api` 获取 transcript
- 调用 LLM 生成会议纪要

3. 存储层
- `SQLite`：存元数据、任务状态、下载记录、speaker 修正、summary
- 文件系统：存音频、转录 JSON、修正版 JSON、导出文件


## 3. 核心原则

### 3.1 不侵入 `funasr-api`

`funmemo` 不直接改造 `funasr-api` 的接口协议，而是把它当作 provider 使用。

默认调用：

- `POST /v1/audio/transcriptions`

推荐 `response_format=verbose_json`，以获取：

- `text`
- `segments`
- `words`
- `speaker`

### 3.2 任务化而不是长请求

所有耗时处理都设计成 job：

- 上传创建 job
- 后台 worker 执行任务
- 前端轮询或订阅任务状态
- 页面关闭后通过 `job_id` 恢复

### 3.3 SQLite 只存索引，不存大文件

SQLite 存：

- job
- 状态
- 路径
- speaker profile
- summary
- download logs

文件系统存：

- 原始音频
- transcript JSON
- annotated transcript JSON
- markdown 导出
- 其他下载文件


## 4. 推荐技术栈

### 4.1 前后端

- `Next.js` App Router
- `TypeScript`
- `React`
- `Tailwind CSS` 或 `CSS Modules`

### 4.2 数据层

- `SQLite`
- `Prisma` 或 `Drizzle`

优先建议：

- `Prisma + SQLite`

原因：

- 建模速度快
- 迁移成本低
- 对后台业务开发更直接

### 4.3 任务执行

第一阶段：

- `Next.js` 业务 API + 独立 Node worker

第二阶段可选：

- 若并发提升，再演进为独立队列

不建议第一版使用 Redis/Celery/BullMQ，复杂度过高。


## 5. 目录结构建议

建议在 `/root/meet/funmemo` 下新建独立项目：

```text
funmemo/
  app/
    (dashboard)/
      jobs/
      jobs/[jobId]/
    api/
      jobs/
      jobs/[jobId]/
      jobs/[jobId]/transcript/
      jobs/[jobId]/speakers/
      jobs/[jobId]/summary/
      jobs/[jobId]/downloads/
  components/
    upload/
    transcript/
    summary/
    common/
  lib/
    db/
    repositories/
    services/
    providers/
    jobs/
    utils/
  worker/
    runner.ts
    handlers/
      transcribe.ts
      summarize.ts
  prisma/
    schema.prisma
  storage/
    jobs/
  docs/
```


## 6. 数据流设计

### 6.1 转录流程

1. 用户上传音频到 `funmemo`
2. `funmemo` 创建 `job`
3. 音频保存到 `storage/jobs/{jobId}/source/`
4. job 状态写入 SQLite：`queued`
5. worker 领取 job
6. worker 调用 `funasr-api /v1/audio/transcriptions`
7. 保存 `transcript.raw.json`
8. 更新 job 状态为 `transcript_ready`

### 6.2 人名/部门修正流程

1. 前端读取 transcript
2. 用户为 speaker 编辑：
- 姓名
- 部门
- 职务（可选）
3. 前端保存修正结果
4. 后端生成 `transcript.annotated.json`
5. 更新 `speaker_profiles`

### 6.3 会议纪要流程

1. 用户点击“生成纪要”
2. `funmemo` 创建 `summary` 任务
3. worker 读取修正后的 transcript
4. 生成适合 LLM 的 transcript 文本
5. 调用 LLM `/v1/chat/completions`
6. 保存 `summary.md`
7. 更新 job 状态为 `summary_ready`


## 7. Job 状态机

建议统一状态：

- `queued`
- `transcribing`
- `transcript_ready`
- `speaker_editing`
- `summarizing`
- `summary_ready`
- `completed`
- `failed`

说明：

- `speaker_editing` 不是必须入库的硬状态，也可视为 `transcript_ready` 的 UI 子状态
- `completed` 表示摘要和主要产物均已就绪

推荐步骤状态：

- `upload`
- `transcription`
- `annotation`
- `summary`
- `export`


## 8. SQLite 表设计

### 8.1 jobs

用途：任务主表

建议字段：

- `id`
- `title`
- `source_filename`
- `status`
- `current_step`
- `error_message`
- `audio_duration_sec`
- `segment_count`
- `speaker_count`
- `language`
- `created_at`
- `updated_at`
- `completed_at`

### 8.2 job_files

用途：任务关联文件

建议字段：

- `id`
- `job_id`
- `file_type`
- `path`
- `mime_type`
- `size_bytes`
- `created_at`

`file_type` 建议枚举：

- `source_audio`
- `transcript_raw`
- `transcript_annotated`
- `summary_markdown`
- `export_markdown`
- `export_json`

### 8.3 speaker_profiles

用途：说话人修正信息

建议字段：

- `id`
- `job_id`
- `speaker_id`
- `speaker_name`
- `speaker_department`
- `speaker_title`
- `speaker_display`
- `sort_order`
- `created_at`
- `updated_at`

### 8.4 summaries

用途：会议纪要内容

建议字段：

- `id`
- `job_id`
- `content_markdown`
- `prompt_version`
- `custom_prompt`
- `system_prompt`
- `status`
- `generated_at`
- `updated_at`

### 8.5 downloads

用途：下载记录

建议字段：

- `id`
- `job_id`
- `download_type`
- `file_path`
- `client_ip`
- `user_agent`
- `created_at`

### 8.6 job_events

用途：任务审计和问题排查

建议字段：

- `id`
- `job_id`
- `event_type`
- `message`
- `payload_json`
- `created_at`


## 9. 文件存储结构

建议按 job 分目录：

```text
storage/jobs/{jobId}/
  source/
    original.wav
  transcript/
    transcript.raw.json
    transcript.annotated.json
  summary/
    summary.md
  exports/
    meeting-summary.md
    meeting-transcript.json
  meta/
    request.json
```

说明：

- 原始大 JSON 放文件
- 数据库只存路径
- 导出文件可复用已有源文件生成


## 10. Transcript 数据模型

### 10.1 原始 transcript

来自 `funasr-api verbose_json`，建议保留原始字段。

核心字段：

- `text`
- `language`
- `duration`
- `segments[]`
  - `id`
  - `start`
  - `end`
  - `text`
  - `speaker`
- `words[]`

### 10.2 修正后的 transcript

在原始 transcript 基础上补充：

- `speaker_profiles[]`
- 每个 segment 补充：
  - `speaker_id`
  - `speaker_name`
  - `speaker_department`
  - `speaker_title`
  - `speaker_display`

不建议继续只保留 `speaker_role`，因为“部门”和“角色”语义不同。


## 11. API 设计

### 11.1 创建任务

`POST /api/jobs`

用途：

- 上传音频
- 创建 job
- 立即返回 `job_id`

返回：

- `job_id`
- `status`
- `created_at`

### 11.2 查询任务详情

`GET /api/jobs/:jobId`

返回：

- 基本信息
- 当前状态
- 进度
- 统计信息
- 可执行动作

### 11.3 任务列表

`GET /api/jobs`

支持：

- 分页
- 状态筛选
- 按时间排序

### 11.4 获取 transcript

`GET /api/jobs/:jobId/transcript`

返回：

- 原始 transcript
- 或 annotated transcript

建议支持：

- `version=raw`
- `version=annotated`

### 11.5 保存说话人信息

`PATCH /api/jobs/:jobId/speakers`

请求体：

```json
{
  "speaker_profiles": [
    {
      "speaker_id": "说话人1",
      "speaker_name": "张三",
      "speaker_department": "产品部",
      "speaker_title": "产品经理"
    }
  ]
}
```

处理：

- 更新 `speaker_profiles`
- 重新生成 `transcript.annotated.json`

### 11.6 生成纪要

`POST /api/jobs/:jobId/summary`

请求体可包含：

- `custom_prompt`
- `system_prompt`
- `force_regenerate`

行为：

- 创建摘要任务
- 异步执行

### 11.7 获取纪要

`GET /api/jobs/:jobId/summary`

返回：

- `status`
- `content_markdown`
- `generated_at`

### 11.8 更新纪要

`PATCH /api/jobs/:jobId/summary`

用途：

- 用户手动修正文案

### 11.9 下载接口

`GET /api/jobs/:jobId/downloads/:type`

建议支持：

- `transcript-json`
- `summary-md`
- `annotated-json`

每次下载写入 `downloads` 表。


## 12. 前端页面设计

### 12.1 页面结构

建议页面：

1. `/`
- 上传入口
- 最近任务

2. `/jobs`
- 任务列表

3. `/jobs/[jobId]`
- 任务总览
- 状态
- 快捷操作

4. `/jobs/[jobId]/transcript`
- transcript 查看与编辑
- 时间线
- speaker 修正

5. `/jobs/[jobId]/summary`
- 纪要展示
- 重新生成
- 编辑与下载

### 12.2 Transcript 编辑页核心区块

- 顶部状态栏
- 音频播放器
- 说话人卡片列表
- 时间线
- transcript 分段列表
- 保存按钮
- 生成纪要按钮

### 12.3 Summary 页面核心区块

- 纪要 markdown 预览
- 编辑模式
- prompt 设置
- 重新生成
- 下载


## 13. UI 设计方向

建议不复用 `viewer` 的静态单页结构，但可以复用其交互逻辑。

推荐设计基调：

- 偏“工作台”风格
- 左侧为任务/说话人信息
- 中间为 transcript/summary 主内容
- 右侧为属性和操作面板

建议重点优化：

- 上传成功后立即进入任务详情
- transcript 编辑时自动保存或显式保存
- 状态切换明确
- 页面刷新后可恢复


## 14. Worker 设计

### 14.1 为什么要独立 worker

不能把转录和摘要生成放在单个请求里执行，原因：

- 耗时长
- 用户可能关闭页面
- 任务需要恢复
- 需要失败重试

### 14.2 Worker 最小实现

独立 Node 进程：

- 轮询 SQLite 中 `queued` 的 job
- 抢占任务
- 更新状态为 `transcribing` 或 `summarizing`
- 执行完成后写回结果

### 14.3 Worker 任务类型

- `transcribe`
- `summarize`

### 14.4 失败策略

- 记录错误信息
- 状态标记为 `failed`
- 前端允许重试


## 15. 调用 `funasr-api` 方式

调用建议：

- 使用 `OpenAI SDK` 或标准 `fetch`
- 命中 `funasr-api /v1/audio/transcriptions`

请求建议：

- `model`
- `file`
- `response_format=verbose_json`
- `enable_speaker_diarization=true`
- `word_timestamps=true`

不要依赖 `funasr-api` 的私有数据目录或内部脚本。


## 16. 纪要生成逻辑

### 16.1 输入

优先使用修正后的 transcript。

格式建议：

```text
张三（产品部，产品经理）：我们先确认这周上线目标。

李四（研发部，后端负责人）：接口改动需要两天。
```

若缺少姓名，则降级为：

```text
说话人1：我们先确认这周上线目标。
```

### 16.2 Prompt 设计

输出要求：

- markdown
- 不要虚构
- 聚焦：
  - 会议主题
  - 关键结论
  - 风险项
  - 待办事项
  - 负责人

### 16.3 长会议处理

第一阶段：

- 直接整段输入

第二阶段：

- 按 token 或段落分块摘要
- 再汇总成最终纪要


## 17. 下载与导出

第一阶段支持：

- annotated transcript JSON
- summary markdown

第二阶段支持：

- 合并导出 markdown
- DOCX/PDF

下载记录要落 SQLite，便于审计和统计。


## 18. 权限与认证

第一阶段可简单处理：

- 内网单用户或弱认证

第二阶段可接入：

- NextAuth
- 企业 SSO

若后续做多人协作，表中需增加：

- `created_by`
- `updated_by`
- `owner_id`


## 19. 分阶段实施计划

### Phase 1：最小闭环

目标：

- 可上传
- 可转录
- 可修正 speaker
- 可生成 summary
- 可下载 markdown/json

范围：

- Next.js 项目初始化
- SQLite schema
- job API
- worker
- transcript 页面
- summary 页面

### Phase 2：体验增强

目标：

- 任务列表
- 历史记录
- 自动保存
- 重试机制
- 下载记录

### Phase 3：进阶能力

目标：

- 长会议分块总结
- 更多导出格式
- 多用户权限
- 外部分享或审阅


## 20. 风险与对策

### 20.1 风险：长任务中断

对策：

- 独立 worker
- SQLite 持久化状态
- 页面基于 `job_id` 恢复

### 20.2 风险：SQLite 文件膨胀

对策：

- 大文件不入库
- 定期清理老任务
- 数据库存索引和路径

### 20.3 风险：纪要 hallucination

对策：

- prompt 限制
- 只基于 transcript 输出
- 支持人工编辑

### 20.4 风险：底层接口变化

对策：

- `funmemo` 中封装 provider adapter
- 不在业务代码里散落 `funasr-api` 响应解析逻辑


## 21. 最终建议

FunMemo 的最佳落地方式是：

1. 保持 `funasr-api` 作为纯 ASR provider
2. 使用 `Next.js` 新建全栈业务系统
3. 用 `SQLite + 文件系统` 存储任务和产物
4. 使用独立 worker 执行转录与纪要生成
5. 前端围绕 `job_id` 实现可恢复的任务式体验

这个方案兼顾了：

- 对现有 `funasr-api` 的低侵入
- 正式前端的可维护性
- 长任务恢复能力
- 后续扩展空间


## 22. 下一步建议

建议按以下顺序继续推进：

1. 初始化 `Next.js` 项目
2. 建立 SQLite schema
3. 先完成 job 创建、列表、详情 API
4. 接入 `funasr-api` 转录 provider
5. 完成 transcript 编辑页
6. 完成 summary 生成与下载

如果进入实现阶段，建议优先交付 Phase 1 的最小闭环。
