# Change: 移除本地 AI/通用聊天栈，收敛为 Legal + Auth + Redis/Blob（保留）

## Why

当前仓库包含两套“法律能力”来源：

1. **本地 AI 栈**：`lib/ai/**`（多 Agent、prompts、tools、artifact 生成等）+ 一套通用聊天/Artifact UI。
2. **RuoYi Legal 后端**：通过 Next.js BFF 代理（SSE/上传/下载/取消）完成会话与流式对话，前端只负责渲染与交互。

现阶段产品只需要第 2 套能力（Legal 直连后端），本地 AI/通用聊天栈会带来：
- 维护成本与复杂度显著增加（大量未使用代码、依赖、文档）
- 误用风险（未来接 OAuth2 后更容易出现“本地模型”和“后端模型”并存的行为不一致）
- 构建体积与依赖面扩大（AI SDK、工具链、artifact 编辑器等）

因此需要将仓库 **收敛为最小可用集合**：Legal 页面与 BFF、认证能力、（可选）Redis 缓存与 Blob 依赖保留，其余移除。

## What Changes

### 1) 删除本地 AI/通用聊天能力
- 删除 `lib/ai/**`（agents、router、orchestrator、tools、prompts、tracing 等）
- 删除与其绑定的通用聊天/Artifact 相关代码（`artifacts/**`、`lib/artifacts/**`、`lib/editor/**`、与之相关的 components/hooks）

### 2) 保留并稳定现有能力边界
- Legal：保留 `app/(legal)/**` 的 BFF 路由与 UI 渲染（含 SSE fallback、上传、下载代理）
- Auth：保留 `app/(auth)/**` 登录/注册/NextAuth API（保持 URL 不变）
- Redis：保留 `lib/cache/**`（可选，不配置 `REDIS_URL` 时自动禁用）
- Blob：保留依赖与（如存在）相关接口；不强制要求配置（避免阻塞本地联调）

### 3) 收敛共享类型/工具，去除不必要的交叉依赖
- 仅保留 Legal/Auth 需要的最小 `lib/utils`/types 形态，避免 `lib/utils` 再耦合本地 AI 类型或 DB schema 类型（降低前端 bundle 负担与耦合）

## Impact

- **BREAKING（内部能力）**：本地 AI/多 Agent/通用聊天/Artifact 生成能力移除；相关组件、hooks、API 将不再存在。
- **对外行为（保留）**：Legal UI 与对接 RuoYi 后端的能力保持；Auth 路由保持；Redis/Blob 保留为可选能力。

## Risks

1. **残留引用导致编译失败**：TypeScript include 覆盖全仓库，必须彻底删除或解除引用。
2. **Auth 依赖 DB**：当前认证实现使用 Postgres/Drizzle（`lib/db/**`）。本变更默认保留 DB 相关代码；若要“认证无 DB”，需单独变更重构。
3. **依赖裁剪风险**：如同步删除 NPM 依赖，需要确保 legal/auth 仍能 build（建议在本变更中以 `tsc`/`next build` 校验）。

## Open Questions

（默认答案，如需调整请在本变更内确认）

1. 认证是否继续保留“邮箱/密码 + guest”这套实现（因此继续需要 Postgres）？默认：**是**。
2. Blob 当前是否有明确使用场景（例如通用文件上传）？默认：**仅保留依赖，不强制启用**。

