# Change: Legal 页面改为对接 RuoYi App AI（SSE + 下载代理）

## Why

当前 `/app/(legal)` 法律对话链路存在以下问题：

- **后端来源割裂**：对话走 `LEGAL_API_BASE_URL`（旧服务），Textract 走 `TEXTRACT_API_BASE_URL`（新服务），配置与依赖不一致。
- **需要统一接入 RuoYi**：法律对话/会话/文书下载需要直接对接 RuoYi-Vue-Plus-Legal 后端的 App 接口：
  - `AppAiSessionController`（会话）
  - `AppAiMessageController`（消息、SSE、取消）
  - `AppAiDocumentDownloadController`（文书下载）
- **前后端不同域**：若浏览器直连后端，会遇到 CORS、SSE 代理、下载鉴权（`<a>` 无法携带 `Authorization`）、Cookie/SameSite 等工程问题，需要一套可落地的架构方案。

## What Changes

### 1) 统一后端 URL（配置收敛）

- 统一使用 `BASE_URL` 作为 Legal 页面访问 RuoYi 的**唯一后端 URL**（例如 `http://localhost:8080`）。
- 旧变量不做兼容：`TEXTRACT_API_BASE_URL`、`LEGAL_API_BASE_URL` 统一替换为 `BASE_URL`。
- 联调期鉴权使用环境变量：`BEARER_TOKEN`（纯 token，由 BFF 拼装 `Bearer` 前缀）+ `CLIENTID`（例如 `e5cd7e4891bf95d1d19206ce24a7b32e`）。

### 2) 推荐架构：Next.js 作为 BFF/适配层（解决跨域 + 下载鉴权）

保留前端同域调用 `/api/...`，由 Next.js Route Handler 作为 BFF 转发到 `${BASE_URL}`：

- `POST /api/legal/interact`
  - **init**：调用 `POST /app/legal/ai/session/create`，用返回的 `lastMessageText/currentStep/sessionUuid` 直接渲染欢迎信息（无需额外拉取消息历史；`prompt` 可由前端默认值兜底）
  - **non-stream**：转发至 `POST /app/legal/ai/message/send`
  - **SSE**：转发至 `POST /app/legal/ai/message/send_stream`，透传 `text/event-stream`
  - **cancel**：补齐 `POST /app/legal/ai/message/cancel` 的前端调用能力（用于“停止生成/断流”）
- `POST /api/legal/upload`
  - **upload**：代理至 `POST /app/legal/upload/files`，返回 `ossId/url/fileName/contentType/fileSize`，用于前端预览与组装 `media_attachments`
- `GET /api/document/download/:documentId`、`GET /api/download/:fileName`
  - 在前端实现**下载代理**，用服务端注入 `Authorization`（解决跨域 `<a>` 无法带 header 的问题），并透传后端 `Content-Disposition` 等下载头。

> 备注：该方案让浏览器只与前端同域通信，从根上避免 CORS/跨站 Cookie 复杂度；后端仅需对“前端服务端”可达即可。

### 3) 认证策略（OAuth2：本提案预留，不在本次实现范围）

- 生产目标：通过 `integrate-ruoyi-oauth2` 变更获取用户 `access_token`，由 BFF 在服务端注入 `Authorization: Bearer <token>` 访问 RuoYi。
- 本次变更仅做“鉴权透传能力预留”，不实现 OAuth2 登录闭环；联调阶段使用环境变量提供固定 `BEARER_TOKEN` 与 `CLIENTID`，用于验证接口链路。

### 4) 前端调用清理

- Legal 对话相关请求不再从 `lib/api/legal.ts` 走旧抽象（避免继续固化 “/api/session/interact” 模型），统一收敛到新的 BFF 路由（或新增 `lib/api/ruoyi-legal-ai.ts` 专用封装）。
- Legal 页面启用 SSE（当前页面禁用 streaming），并补齐 stop/cancel 的端到端行为。
- 附件提交改为 `media_attachments`（仅传 `oss_id` 与元信息），由后端执行 textract 并落库 `legal_ai_message_media`。
- 上传文件类型与后端白名单对齐（`MimeTypeUtils.DEFAULT_ALLOWED_EXTENSION`），并且不再由前端传 `msg_type`（由后端基于 `content_type/文件名` 推断）。
- 语音输入采用“语音转文本”：录音仅用于识别并填充文本，不作为附件上传（避免 `.webm` 与后端扩展名白名单冲突）。
- SSE 收到 `fallback` 时前端自动无感切换到 non-stream，保证对话不中断。

## Impact

- **Affected code (ai-chatbot)**：
  - `app/(legal)/api/legal/interact/route.ts`（对接 RuoYi，会话/消息/SSE 适配）
  - `app/(legal)/api/textract/route.ts`、`app/(legal)/api/textract/oss-info/route.ts`（统一到 `BASE_URL` + 注入 `BEARER_TOKEN/CLIENTID`，用于语音转文本等能力）
  - `app/api/legal/upload/route.ts`（新增，附件上传代理）
  - `app/api/document/download/[documentId]/route.ts`（新增，下载代理）
  - `app/api/download/[fileName]/route.ts`（新增，下载代理）
  - `hooks/use-legal-chat.ts`、`components/legal/legal-chat.tsx`（启用 SSE、取消交互、统一调用方式）
  - `.env.example`（配置收敛与说明）
- **External dependency (RuoYi-Vue-Plus-Legal)**：
  - `/app/legal/ai/session/*`
  - `/app/legal/ai/message/*`
  - `/api/document/download/*`、`/api/download/*`

## Risks

- **SSE 在生产代理链路易被缓冲/超时**：需要 Nginx/CDN 禁用缓冲（例如 `X-Accel-Buffering: no`）、合理的 idle timeout。
- **初始化 prompt 字段缺失**：`createSession` 当前返回 `lastMessageText` 可渲染欢迎语，但若需要更精确的 `prompt`，需后端补齐或前端使用默认 prompt。
- **下载鉴权与跨域**：若绕过 BFF 直接跳转后端下载链接，将无法携带 `Authorization`，导致 401；必须通过代理或改为后端签名 URL 模式。
- **语音识别格式兼容**：语音转文本若走 textract 上传链路，需要确认后端 textract 对 `audio/webm`/`audio/mp4` 的支持；必要时改为浏览器原生语音识别或做格式兼容策略。
- **OAuth2 未落地前无法端到端真实校验权限**：需明确联调期 token 注入方案，避免“假通”。
