## Context

Legal 页面（`app/(legal)`）目前通过前端同域 API `POST /api/legal/interact` 与后端交互：

- 旧实现：`/api/legal/interact` → `${LEGAL_API_BASE_URL}/api/session/interact`
- Textract：`/api/textract*` → `${TEXTRACT_API_BASE_URL}/app/legal/textract/*`

本变更将移除上述两类 URL 环境变量，统一为：

- `BASE_URL`（例如 `http://localhost:8080`）

现在需要将 Legal 对话统一对接到 RuoYi-Vue-Plus-Legal（`BASE_URL=http://localhost:8080`）的 App 端接口：

- 会话：`POST /app/legal/ai/session/create`
- 消息（非流）：`POST /app/legal/ai/message/send`
- 消息（流式 SSE）：`POST /app/legal/ai/message/send_stream`
- 取消：`POST /app/legal/ai/message/cancel`
- 下载：`GET /api/document/download/{documentId}`、`GET /api/download/{fileName}`

约束：

- **前后端不同域**（浏览器直连会触发 CORS/跨站问题）
- **必须启用 SSE**
- **认证最终走 OAuth2**（但本次不实现 OAuth2 登录闭环，仅预留透传）

## Goals / Non-Goals

### Goals

- Legal 页面与 RuoYi App AI 全量打通：init → SSE 对话 → completed → 下载。
- 保持前端调用入口尽量稳定（优先复用 `/api/legal/interact`）。
- 在跨域场景下可用：下载/流式不依赖浏览器跨域携带 `Authorization`。

### Non-Goals

- 不在本次实现 OAuth2（参考 `openspec/changes/integrate-ruoyi-oauth2`）。
- 不在本次重做 UI 或引入会话历史列表（可作为后续迭代）。

## Decision 1: 采用 BFF（推荐）

### 方案 A（推荐）：Next.js Route Handler 作为 BFF

浏览器 →（同域）→ ai-chatbot `/api/...` →（服务端）→ RuoYi `${BASE_URL}`

**优点**

- 浏览器侧无 CORS 负担；SSE 通过同域 fetch 更稳定。
- 解决“下载鉴权”硬问题：`<a href>` 无法携带 `Authorization`，必须通过服务端代理或后端签名 URL。
- 便于未来 OAuth2：BFF 可在服务端读取 NextAuth session/jwt，并注入 `Authorization`。

**缺点**

- 需要维护一层“协议适配”（RuoYi 的 `R<InteractResult>` 与前端 `LegalApiResponse`）。

### 方案 B（备选）：浏览器直连 RuoYi（不推荐）

若浏览器直接请求 RuoYi：

- 必须做 CORS（含 `Authorization` header、SSE 的 preflight/超时、下载头暴露）
- 下载链接无法带 `Authorization`（除非改为 query token 或后端签名 URL）

因此该方案仅作为文档化备选，不作为默认落地。

## API Contract Mapping

### 前端输入（保持现有 `LegalInteractRequest`）

前端当前发送：

- `session_id?: string`
- `message?: string`
- `stream?: boolean`
- `action?: "continue" | "skip" | "submit_answers" | "generate_document"`
- `data?: Record<string, unknown>`
- `media_attachments?: [{ oss_id, file_name?, file_size?, content_type?, msg_type?, media_duration? }]`

### 后端输入（RuoYi `AppAiInteractRequest`）

RuoYi 侧入参（关键字段）：

- `session_id`（必填：非 init）
- `message`
- `action`（可选；默认 `continue`）
- `data`（可选）
- `stream`
- `media_attachments`（可选；本次启用，用于后端 textract 与落库）

### 适配策略

#### init（无 `session_id`）

基于现有后端返回（`/app/legal/ai/session/create` 已包含 `sessionUuid/currentStep/lastMessageText`），BFF 可直接组装前端所需的 init 响应：

- `session_id = sessionUuid`
- `next_step = currentStep`
- `data.message = lastMessageText`
- `data.prompt` 若后端未返回，可由前端默认值兜底

可选增强（仅在需要 `prompt` 或需要与上游 `data` 完整对齐时）：

1. **后端增强（推荐）**：新增 `POST /app/legal/ai/session/init` 或增强 `create` 返回 greeting 的结构化 `data`（含 `prompt`）。
2. **BFF 兼容（可行但多一次请求）**：BFF 调用 `create` 后，再调用消息历史接口并解析 `ext` 还原 `prompt/上游data`。

#### non-stream

`/api/legal/interact`（stream=false） → `POST /app/legal/ai/message/send`

返回值适配：

RuoYi：`R<InteractResult>`（含 `sessionId/nextStep/data/message`）

前端：`{ session_id, next_step, data }`

适配要点：

- `session_id = InteractResult.sessionId`
- `next_step = InteractResult.nextStep`
- `data = InteractResult.data`（若缺 `message`，可用 `InteractResult.message` 补齐）

#### SSE

`/api/legal/interact`（stream=true） → `POST /app/legal/ai/message/send_stream`（`text/event-stream`）

后端 SSE 事件为 `data: {json}`，其中 `type` 可能包含：

- `start` / `content` / `done` / `error`
- `fallback`（后端明确存在该类型，需要前端与类型定义兼容）

前端解析器基于 `data:` 行即可复用。

#### 附件（media_attachments）

本次采用“后端抽取 + 落库附件明细”的方式：

1. 前端先上传原始文件到后端 OSS，获取 `ossId/url`（建议使用 `POST /app/legal/upload/files`）。
2. 前端在对话请求中不再传 `attachments[].text_content`，改为传 `media_attachments[].oss_id`（以及可选的 `file_name/content_type/file_size/msg_type`）。
3. 后端在 `send/send_stream` 中优先处理 `media_attachments`：
   - 写入 `legal_ai_message_media`（元数据先落库）
   - 执行 textract，回填 `extract_*`
   - 构造并转发上游 `attachments`（携带 `text_content`）

该策略可以保证附件信息可追溯且历史可恢复，并避免前端承担 OCR/ASR 结果格式兼容。

#### fallback 自动降级

当 SSE 收到 `type:"fallback"` 时，表示当前阶段不支持流式（或上游回落非流式）。

注意：后端 `send_stream` 在 `fallback` 分支会直接结束 SSE（不会发送 `done`），因此客户端必须把 `fallback` 视为“终止信号”，并立即触发 non-stream 重试。

前端策略：**自动无感切换为非流式**：

1. 立即结束本地 SSE 读取（abort）
2. 对同一用户输入再次调用 non-stream（`stream=false`）以获取最终 `{ next_step, data }`
3. UI 不新增重复用户气泡（复用原 user message 展示），并将最终 AI 回复渲染到同一条 assistant 气泡

## Auth Strategy (OAuth2 Deferred)

RuoYi 使用 Sa-Token，默认读取 header `Authorization` 且 `token-prefix: Bearer`。

本次变更建议在 BFF 内实现如下 token 策略（按优先级）：

1. **未来（生产）**：从 NextAuth session/jwt 读取 OAuth2 access_token（来自 `integrate-ruoyi-oauth2`）。
2. **当前（联调）**：从环境变量读取固定 `BEARER_TOKEN`（仅 dev）。
3. 无 token：BFF 返回 401（避免“匿名假通”）。

联调期约定：

- `BEARER_TOKEN` 仅保存 **token 原文**（不包含 `Bearer ` 前缀），由 BFF 统一拼装 `Authorization: Bearer <token>`。
- `CLIENTID` 由业务方提供固定值（例如 `e5cd7e4891bf95d1d19206ce24a7b32e`），BFF 以 header `clientid` 注入。

同时，RuoYi 的安全校验要求 `clientid` 与 Token.extra 一致（见后端文档与 `SecurityConfig`），因此 BFF 对所有上游请求还 SHALL 注入：

- `clientid: <值>`

`clientid` 的来源建议（按优先级）：

1. **未来（生产）**：从 NextAuth session/jwt 读取（OAuth2 登录后由后端返回并保存；或由 access_token 的 claim 推导）。
2. **当前（联调）**：从环境变量读取固定 `CLIENTID`（仅 dev）。
3. 缺失时：BFF 返回 401/400，并提示需要配置 `clientid`。

## Download Strategy

RuoYi 生成的 `download_url` 为相对路径（例如 `/api/document/download/{documentId}`）。

为保证跨域可用且可携带鉴权：

- 在 ai-chatbot 增加同路径代理：
  - `GET /api/document/download/:documentId` → `${BASE_URL}/api/document/download/:documentId`
  - `GET /api/download/:fileName` → `${BASE_URL}/api/download/:fileName`
- 代理层需要注入 `Authorization`，并透传下载响应 headers。

## Upload Strategy & File Type Policy

本次附件上传统一走后端 `POST /app/legal/upload/files`（经 BFF 代理）。

后端对文件扩展名做白名单校验：`MimeTypeUtils.DEFAULT_ALLOWED_EXTENSION`（ruoyi-common-core），因此前端在选择文件时应对齐同一“允许列表”，以减少用户端报错与重试成本。

后端实现细节（用于前端对齐）：

- 校验基于**文件名扩展名**（`FileUtil.extName(originalName)`），不是基于 `Content-Type`；因此前端必须保留正确的文件名后缀，否则会被拒绝。
- 当前白名单为：`bmp,gif,jpg,jpeg,png,doc,docx,xls,xlsx,ppt,pptx,html,htm,txt,rar,zip,gz,bz2,mp3,mp4,avi,rmvb,pdf`。
- 上传接口实际接收表单字段名 `files`（多文件），返回 `UploadCredentialVo[]`（包含 `ossId,url,fileName,contentType,fileSize` 等），前端据此组装 `media_attachments`。

注意事项：

- `msg_type` 不由前端传入，后端会根据 `content_type`/文件名推断（`normalizeMsgType`）。
- 语音能力采用“语音转文本”：
  - 语音录制完成后通过 Textract 进行识别：`POST /api/textract` → `${BASE_URL}/app/legal/textract/multiple`（建议 `scene=voice`），并由 BFF 注入 `Authorization` + `clientid`
  - 识别结果仅填充到输入框，最终仍以普通文本消息发送；语音文件不作为 `upload/files` 附件上传（避免 `.webm` 等格式与 `DEFAULT_ALLOWED_EXTENSION` 冲突）。

## Upload Limits (Backend-Managed)

上传大小与总量限制统一由后端管理（Spring multipart，例如默认 `max-file-size: 10MB`、`max-request-size: 20MB`）。

本提案不新增前端/BFF 的“文件数/大小”硬限制逻辑，仅要求：

- BFF 透传后端状态码与错误信息
- 前端对超限/失败给予可理解的提示（例如 toast 展示后端 `msg`）

## Cancel Semantics

后端取消接口 `POST /app/legal/ai/message/cancel` 入参包含：

- `sessionUuid`（必填）
- `messageId`（可选；不传则取消该会话下最后一条 `status=0` 的用户消息）

由于 SSE 流目前不向前端暴露本地 `messageId`，本次实现将采用“仅传 `sessionUuid`”的取消方式（取消最后一条发送中消息）。

## SSE Production Considerations

为提升 SSE 在生产的稳定性：

- BFF 响应头建议包含：
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`（Nginx）
- 若存在上游反向代理/CDN，需要禁用缓冲并配置较长 idle timeout（否则会截断流）。
- stop/cancel：
  - 前端 abort 本地读取流后，应调用后端 `POST /app/legal/ai/message/cancel`（至少带 `sessionUuid`）以停止后端任务，避免资源泄漏与“幽灵生成”。

## CORS Notes (Only If Direct-to-Backend Is Required)

若必须浏览器直连 RuoYi（不推荐），需要后端满足：

- `Access-Control-Allow-Origin` 精确到前端域名（不可用 `*` 搭配 credentials）
- `Access-Control-Allow-Headers` 至少包含 `Authorization, Content-Type`
- `Access-Control-Allow-Methods` 包含 `GET, POST, OPTIONS`
- SSE（POST fetch）会触发 preflight：需实现 `OPTIONS` 并正确返回允许项
- 下载需 `Access-Control-Expose-Headers: Content-Disposition,download-filename`（后端已有，但仍需允许跨域）

同时需解决“下载鉴权”无法携带 header 的问题（通常只能走代理或签名 URL）。

## Migration Plan

1. **Phase 0（本提案）**：完成 BFF 适配 + SSE + 下载代理，支持 dev token 联调。
2. **Phase 1（后续）**：落地 OAuth2（`integrate-ruoyi-oauth2`），BFF 从 session 注入真实用户 token。
3. **Phase 2（可选）**：利用 RuoYi 的会话/消息列表接口实现历史会话列表与恢复能力。
