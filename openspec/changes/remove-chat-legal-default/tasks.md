## 1. 路由收敛（Legal 默认入口）

- [x] 1.1 删除 `app/(chat)/`（页面、layout、actions、API routes、静态资源）
- [x] 1.2 将 Legal UI 统一到 `/`（直接渲染，不再依赖 `/legal` 作为入口）
- [x] 1.3 （可选）保留 `/legal` 并重定向到 `/`

## 2. 认证保留（保留 `app/(auth)` 路由组）

- [x] 2.1 保留 `app/(auth)`（URL 不变：`/login`、`/register`、`/api/auth/*`）
- [x] 2.2 将认证相关文件保持在 `app/(auth)`，并移除 `app/(legal)` 下的 auth 残留与 imports
- [x] 2.3 保留 Auth.js/NextAuth 配置与调用点（便于后续对接自有后端认证）

## 3. 清理残留引用（避免 TypeScript 构建失败）

- [x] 3.1 清理对 `app/(chat)` 的引用（routes/actions/components/hooks/tests/docs）
- [x] 3.2 统一更新对 `app/(auth)/auth`、`app/(auth)/actions` 的 imports（如有）
- [x] 3.3 清理 docs/README 内对 chat/auth 路由的引用（按需）

## 4. Legal 公开访问

- [x] 4.1 移除 Legal 页面与 legal/textract API 的 `auth()` 校验与 401/redirect

## 5. 测试与验证

- [x] 5.1 更新/移除 Playwright 中与 chat 相关用例与 PageObject（auth 相关按迁移后实际调整）
- [x] 5.2 运行 `pnpm lint`（当前 `npx ultracite@latest` 与 `biome.jsonc` 存在兼容问题，未在本变更中修复既有 lint 报告）
- [x] 5.3 运行 `pnpm test`
- [x] 5.4 运行 `pnpm build`

## Dependencies / Notes

- 3.x 依赖 1.x/2.x 后才能稳定收敛（先删路由再清引用更直观）
- 认证文件建议保持在 `app/(auth)`，后续如需抽离可集中到 `lib/auth/*`，路由层做薄封装
