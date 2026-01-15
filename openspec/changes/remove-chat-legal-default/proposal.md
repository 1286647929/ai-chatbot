# Change: 移除 Chat 路由，Legal 作为默认入口（保留认证能力）

## Why

当前项目的 App Router 以路由组划分：
- `app/(chat)/` 提供主聊天页面（`/`、`/chat/[id]`）与多组聊天相关 API
- `app/(auth)/` 提供登录/注册页面与 Auth.js(NextAuth) API
- `app/(legal)/` 提供法律助手页面（`/legal`）与法律相关 API（`/api/legal/interact`、`/api/textract*`）

本次需求是将产品表面收敛为“以法律助手为默认入口”，移除主聊天入口，并确保访问根路径 `/` 时默认进入法律助手。同时**保留认证能力**，便于后续接入你自己的后端系统做认证。

## What Changes

### 路由/页面
- 移除 `app/(chat)/`（页面、layout、server actions、API routes、opengraph assets）
- 访问 `/` **直接渲染** Legal（canonical URL 为 `/`），并将 `/legal` 重定向到 `/`（兼容保留路径）

### 认证
- 保留 Auth.js/NextAuth 认证能力（便于后续对接你自己的后端系统认证）
- 认证相关路由继续保留在 `app/(auth)/`（`/login`、`/register`、`/api/auth/*` URL 不变）

### 测试与文档
- 更新/移除与 `/` chat、`/chat/*`、`/api/chat*` 等相关的 Playwright 用例与 PageObject
- 更新 `docs/*`、`README.md`、`openspec/project.md` 中关于路由与认证的描述（按需）

## Impact

- **BREAKING**: 以下路由将不可用（404）：`/`(原 chat 首页)、`/chat/*`、`/api/chat*`、`/api/history`、`/api/vote`、`/api/document`、`/api/suggestions` 等
- 法律相关路由保留：`/legal`、`/api/legal/interact`、`/api/textract`、`/api/textract/oss-info`
- 认证相关路由/能力保留：`/login`、`/register`、`/api/auth/*`（如决定迁移目录则 URL 不变）

## Risks

1. **编译/运行时引用残留**：仓库内存在非路由文件引用 `app/(chat)` 或 `app/(auth)`（例如 hooks/components/lib）；删除目录后需同步清理。
2. **与现有 OpenSpec 变更冲突**：`integrate-ruoyi-oauth2`、`add-legal-multi-agent-qa` 等变更以 auth/chat 为前提；本变更会使其目标失效，需要后续决策（取消/归档/重写）。
3. **外部依赖假设**：法律后端与 textract 后端在无用户 session 的情况下仍可用（通过 `LEGAL_API_KEY`、`TEXTRACT_API_KEY` 等服务端密钥鉴权）。

## Open Questions

（已确认）

1. `/`：统一为 **直接渲染法律页面**（canonical URL 为 `/`），并将 `/legal` 重定向到 `/`（如保留该路径）。
2. 认证路由组：保留 `app/(auth)/`（不迁移认证文件；URL 不变）。
3. 法律页面登录：先不需要登录。Legal 页面与 `/api/legal/*`、`/api/textract*` 不做 `auth()` 校验与 401/redirect。
