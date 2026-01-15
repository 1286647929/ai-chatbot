# Design Notes: Legal Default + Keep Auth

## Routing Decision

目标：访问 `/` 时进入 Legal。

已选实现（URL 统一为 `/`）：
- 使用嵌套路由组隔离布局：`app/(legal)/(site)/layout.tsx` 仅包裹 Legal 主体验
- `app/(legal)/(site)/page.tsx` 作为 `/`（Legal 首页）
- `/legal` 保留为兼容路径：使用 route handler `app/(legal)/(site)/legal/route.ts` 将请求重定向到 `/`

## Auth

为满足“保留认证能力”：
- 保留 Auth.js/NextAuth 作为认证框架（后续可对接你自己的后端系统认证）
- 认证相关 pages/routes/actions/config 保持在 `app/(auth)` 路由组内维护（URL 不变）

法律页面访问：先不需要登录，因此 Legal 页面与 legal/textract API 不做 `auth()` 校验与 401/redirect。
