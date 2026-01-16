## 1. 配置收敛（P0）

- [x] 1.1 更新 `.env.example`：新增并使用 `BASE_URL` 作为 legal 后端 URL
- [x] 1.2 全量替换并移除旧变量：`TEXTRACT_API_BASE_URL`、`LEGAL_API_BASE_URL`
- [x] 1.3 增加联调期临时鉴权配置：`BEARER_TOKEN` + `CLIENTID`（仅 dev）

## 2. BFF：Legal 对话适配（P0）

- [x] 2.1 改造 `app/(legal)/api/legal/interact/route.ts`：改为对接 RuoYi App AI
  - [x] 2.1.1 init：无 `session_id` 时创建会话（`POST /app/legal/ai/session/create`）
  - [x] 2.1.2 non-stream：转发 `POST /app/legal/ai/message/send`
  - [x] 2.1.3 stream：转发 `POST /app/legal/ai/message/send_stream`（透传 SSE）
  - [x] 2.1.4 统一响应适配：`R<InteractResult>` → `{ session_id, next_step, data }`
  - [x] 2.1.5 统一鉴权头：服务端注入 `Authorization: Bearer <token>` + `clientid`（OAuth2 预留 + dev env）
- [x] 2.2 处理 SSE 生产可用性细节
  - [x] 2.2.1 强制 Node runtime（避免 edge 限制）
  - [x] 2.2.2 禁用缓存/缓冲：`Cache-Control: no-cache`、`X-Accel-Buffering: no` 等
  - [x] 2.2.3 处理后端 `fallback`/`error` 事件：`fallback` 自动无感切到 non-stream
- [x] 2.3 （可选）增加独立取消接口 `POST /api/legal/cancel`，映射到 `POST /app/legal/ai/message/cancel`

## 3. BFF：附件上传代理（P0）

- [x] 3.1 新增 `POST /api/legal/upload`：代理到后端 `POST /app/legal/upload/files`（multipart/form-data）
  - [x] 3.1.1 返回 `ossId/url/fileName/contentType/fileSize` 供前端预览与组装 `media_attachments`
  - [x] 3.1.2 注入 `Authorization` + `clientid`
  - [x] 3.1.3 表单字段名使用 `files`（后端接收多文件）
  - [x] 3.1.4 透传后端错误码与消息（例如 multipart 超限导致的 4xx）

## 3.2 BFF：Textract（仅用于语音转文本等工具能力）（P0）

- [x] 3.2.1 更新 `app/(legal)/api/textract/route.ts`：`${BASE_URL}/app/legal/textract/multiple`，注入 `Authorization: Bearer <BEARER_TOKEN>` + `clientid`
- [x] 3.2.2 更新 `app/(legal)/api/textract/oss-info/route.ts`：`${BASE_URL}/app/legal/textract/oss-info`，注入相同鉴权头
- [x] 3.2.3 移除 `TEXTRACT_API_KEY` 依赖（联调期统一使用 `BEARER_TOKEN` + `CLIENTID`）
- [x] 3.2.4 语音识别结果解析与错误透传（前端 toast 展示后端 `msg`）

## 4. BFF：文书下载代理（P0）

- [x] 4.1 新增 `app/api/document/download/[documentId]/route.ts`：代理到后端 `/api/document/download/{documentId}`，并注入鉴权头
- [x] 4.2 新增 `app/api/download/[fileName]/route.ts`：代理到后端 `/api/download/{fileName}`，并注入鉴权头
- [x] 4.3 确保下载响应透传关键 headers（`Content-Disposition`、`Content-Type`、`Content-Length`、`Access-Control-Expose-Headers`）

## 5. 前端调用与 SSE 启用（P0）

- [x] 5.1 在 Legal 页面启用 streaming（当前 `LegalChat` 传入 `enableStreaming: false`）
- [x] 5.2 `hooks/use-legal-chat.ts` 统一走新的 BFF 调用方式（避免 `lib/api/legal.ts` 分叉）
- [x] 5.3 对话请求改为使用 `action + data`（不兼容旧的 “message=skip/JSON” 方式）
- [x] 5.4 附件改为 `media_attachments`：先上传拿 `ossId`，发送时只传 `oss_id` 等元信息
  - [x] 5.4.1 前端文件选择/校验对齐 `MimeTypeUtils.DEFAULT_ALLOWED_EXTENSION`（阻止 `.webm` 等不支持类型）
  - [x] 5.4.2 发送 `media_attachments` 时不传 `msg_type`（由后端推断）
  - [x] 5.4.3 语音策略：语音转文本（录音仅用于识别并填充文本，不作为附件上传）
- [x] 5.5 stop 行为端到端：前端 abort 本地流 + 调用取消接口（对齐后端 `/cancel`）

## 6. 后端对齐建议（P1，RuoYi 仓库内实现）

- [ ] 6.1（可选）增强会话初始化返回：补齐 greeting 的结构化 `data`（例如 `prompt`），避免前端使用默认 prompt
- [ ] 6.2 明确 `send_stream` SSE 事件类型全集（至少 `start|content|done|error|fallback`），并补齐字段一致性（`session_id`、`next_step`）

## 7. 跨域策略说明（P1）

- [ ] 7.1 文档化推荐方案：BFF 代理（浏览器同域调用，避免 CORS）
- [ ] 7.2 文档化备选方案：浏览器直连后端时的 CORS 配置要点（含 SSE、下载、鉴权 header）

## 8. 测试与验收（P2）

- [ ] 8.1 更新/新增 Playwright 用例：覆盖 “init → SSE 对话 → completed → 下载” 主路径
- [ ] 8.2 增加本地联调 checklist（后端启动、token 注入、SSE 不被缓冲、下载可用）
