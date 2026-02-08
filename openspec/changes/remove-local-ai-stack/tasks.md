## 1. 删除本地 AI/通用聊天栈

- [x] 1.1 删除 `lib/ai/**`
- [x] 1.2 删除 `artifacts/**`、`lib/artifacts/**`、`lib/editor/**`、`lib/templates/**` 等仅服务于本地 AI/Artifact 的代码
- [x] 1.3 删除通用聊天/Artifact 相关的 components 与 hooks（保留 Legal/Auth 依赖的最小集合）

## 2. Legal/Auth/共享工具收敛

- [x] 2.1 保留并校验 `app/(legal)/**`、`components/legal/**`、`hooks/use-legal-chat.ts`、`lib/legal/**` 正常编译
- [x] 2.2 保留并校验 `app/(auth)/**` 正常编译（不改变 URL）
- [x] 2.3 清理 `lib/utils` 与共享类型中的 AI/Artifact/DB 交叉依赖（仅保留 Legal/Auth 所需导出）

## 3. 依赖与校验

- [x] 3.1 清理不再使用的依赖（可选：先保留依赖，后续单独裁剪）
- [x] 3.2 运行 `pnpm exec tsc -p tsconfig.json --noEmit`
- [ ] 3.3 （可选）运行 `pnpm build` 做一次端到端确认
