## ADDED Requirements

### Requirement: Single Backend Base URL
系统 SHALL 使用 `BASE_URL` 作为 Legal 页面访问 RuoYi App AI 的唯一后端 URL，且不再兼容 `TEXTRACT_API_BASE_URL` 与 `LEGAL_API_BASE_URL`。

#### Scenario: Proxy uses `BASE_URL`
- **WHEN** 前端调用 `POST /api/legal/interact`
- **THEN** 服务端 SHALL 使用 `${BASE_URL}` 作为上游请求前缀

#### Scenario: Textract proxy uses `BASE_URL`
- **WHEN** 前端调用 `POST /api/textract` 或 `GET /api/textract/oss-info`
- **THEN** 服务端 SHALL 使用 `${BASE_URL}` 作为上游请求前缀

### Requirement: BFF Adapter for RuoYi App AI
系统 SHALL 在 `POST /api/legal/interact` 中将前端请求适配并转发到 RuoYi App AI 接口，并将响应适配为前端既有的 `{ session_id, next_step, data }` 结构。

#### Scenario: Init session
- **WHEN** 请求体不包含 `session_id`
- **THEN** BFF SHALL 创建新会话并返回 greeting 所需字段（`session_id`, `next_step`, `data.message`；`data.prompt` 可选）

#### Scenario: Non-stream message
- **WHEN** 请求体包含 `session_id` 且 `stream=false`
- **THEN** BFF SHALL 转发到 `POST /app/legal/ai/message/send` 并返回 `{ session_id, next_step, data }`

#### Scenario: SSE stream message
- **WHEN** 请求体包含 `session_id` 且 `stream=true`
- **THEN** BFF SHALL 转发到 `POST /app/legal/ai/message/send_stream` 并透传 `text/event-stream`

### Requirement: Stream Reliability & Cancellation
系统 SHALL 支持 SSE 的稳定透传（禁用缓存/缓冲），并提供“停止生成”能力：前端断流后可触发后端取消。

#### Scenario: Stop streaming cancels upstream work
- **WHEN** 用户在 streaming 过程中点击“停止”
- **THEN** 前端 SHALL abort 本地流读取，并调用取消接口以停止后端任务

### Requirement: Media Attachments via OSS (Backend Textract)
系统 SHALL 使用 `media_attachments` + `oss_id` 方式提交附件，附件文本抽取与落库由后端完成；前端不再提交 `attachments[].text_content`。

#### Scenario: Upload attachments for ossId
- **WHEN** 用户选择附件上传
- **THEN** 系统 SHALL 调用同域上传代理以获得 `ossId/url/fileName/contentType/fileSize`

#### Scenario: Send message with media_attachments
- **WHEN** 用户发送包含附件的对话请求
- **THEN** 系统 SHALL 在请求体中携带 `media_attachments[].oss_id`（可选携带文件元信息），并由后端执行 textract 与 `legal_ai_message_media` 落库

### Requirement: Attachment Type Inference & Extension Policy
系统 SHALL 不发送 `media_attachments[].msg_type`，并且在上传前对齐后端文件扩展名白名单（`MimeTypeUtils.DEFAULT_ALLOWED_EXTENSION`），以保证“完全按后端推断/校验”。

#### Scenario: Upload rejects unknown extensions early
- **WHEN** 用户选择了不在后端白名单内的文件（例如 `.webm`）
- **THEN** 前端 SHALL 在上传前提示不支持的文件类型（或阻止选择），避免请求到后端后才失败

#### Scenario: Backend infers attachment msg type
- **WHEN** 前端发送 `media_attachments` 且不包含 `msg_type`
- **THEN** 后端 SHALL 基于 `content_type` 或文件名后缀推断消息类型并进行后续 textract/落库

### Requirement: Seamless Fallback to Non-stream
系统 SHALL 在 SSE 收到 `type:"fallback"` 时自动无感切换为 non-stream，以保证用户体验连续。

#### Scenario: Fallback triggers automatic retry
- **WHEN** SSE 流收到 `type:"fallback"`
- **THEN** 客户端 SHALL 结束本地 SSE 读取并自动以 `stream=false` 重试获取最终结果

### Requirement: Authenticated Download Proxy
系统 SHALL 通过前端同域下载代理保证文书下载可携带鉴权信息（`Authorization` + `clientid`），避免跨域 `<a>` 无法设置 header 的限制。

#### Scenario: Download URL works from the Legal page
- **WHEN** 用户点击 `download_url`（例如 `/api/document/download/{documentId}`）
- **THEN** 前端同域代理 SHALL 注入 `Authorization: Bearer <token>` 与 `clientid: <clientid>` 并透传文件流与下载头

### Requirement: Dev Auth Headers (OAuth2 Deferred)
在 OAuth2 未集成期间，系统 SHALL 支持通过环境变量提供联调鉴权头，并由 BFF 统一注入到上游请求中。

#### Scenario: BEARER_TOKEN is raw token
- **WHEN** BFF 读取环境变量 `BEARER_TOKEN`
- **THEN** BFF SHALL 以 `Authorization: Bearer <BEARER_TOKEN>` 形式注入（`BEARER_TOKEN` 不包含 `Bearer ` 前缀）

#### Scenario: CLIENTID is required
- **WHEN** BFF 调用 RuoYi 上游接口
- **THEN** BFF SHALL 注入 header `clientid: <CLIENTID>`（缺失时返回 401/400 并提示配置）

### Requirement: Voice Input Uses Speech-to-Text (No Voice Attachment Upload)
系统 SHALL 将语音输入处理为“语音转文本”，并将识别结果填充到输入框后再以普通文本消息发送；语音录音文件不作为 `upload/files` 附件上传。

#### Scenario: Voice transcript is appended to input
- **WHEN** 用户完成语音输入并确认
- **THEN** 客户端 SHALL 将识别出的文本追加到输入框内容（不生成 `media_attachments`）

#### Scenario: Voice recognition uses textract proxy
- **WHEN** 用户确认语音输入
- **THEN** 客户端 SHALL 调用 `POST /api/textract`（建议 `scene=voice`）获取识别文本并写入输入框

### Requirement: Backend-Managed Upload Limits
系统 SHALL 依赖后端 multipart 配置管理上传大小/总量限制，前端与 BFF 不新增额外的“文件数/大小”硬限制逻辑，仅负责透传与提示。

#### Scenario: Backend limit errors are surfaced
- **WHEN** 后端因 multipart 超限或其它校验返回 4xx
- **THEN** BFF SHALL 透传状态码与错误信息，前端 SHALL 提示用户
