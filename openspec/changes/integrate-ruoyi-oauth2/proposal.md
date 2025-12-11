# Change: 集成 RuoYi OAuth2 认证

## Why

当前 ai-chatbot 项目使用本地 Credentials Provider (用户名密码认证)，需要与 RuoYi-Vue-Plus-Legal 后端系统集成，实现统一身份认证。通过 OAuth2 授权码模式，用户可使用 RuoYi 系统账号登录 ai-chatbot，实现单点登录 (SSO) 和统一用户管理。

## What Changes

### RuoYi 端 (OAuth2 授权服务器)
- 添加 `sa-token-oauth2` 依赖 (v1.44.0)
- 创建 OAuth2 授权服务器配置
- 注册 ai-chatbot 作为 OAuth2 客户端
- 实现授权端点 (`/oauth2/authorize`, `/oauth2/token`, `/oauth2/userinfo`)
- 配置安全路径排除

### ai-chatbot 端 (OAuth2 客户端)
- 添加 RuoYi OAuth2 Provider 到 NextAuth 配置
- 实现用户信息映射 (RuoYi userId → ai-chatbot User)
- 添加 OAuth2 相关环境变量
- **BREAKING**: 移除本地密码认证，统一使用 OAuth2

## Impact

- **Affected specs**: `oauth2-auth` (新增 capability)
- **Affected code**:
  - `app/(auth)/auth.ts` - 添加 OAuth2 Provider
  - `app/(auth)/auth.config.ts` - 更新回调配置
  - `lib/db/schema.ts` - 添加 externalUserId 字段 (可选)
  - `.env.local` - 新增 OAuth2 环境变量
- **External dependencies**:
  - RuoYi-Vue-Plus-Legal (路径: `/home/aycole/ideaProgram/RuoYi-Vue-Plus-Legal`)
  - Sa-Token OAuth2 模块

## Risks

1. **用户迁移**: 现有本地用户需要与 RuoYi 用户关联
2. **网络依赖**: ai-chatbot 启动依赖 RuoYi 服务可用性
3. **Token 刷新**: 需要处理 OAuth2 token 过期和刷新逻辑

## Prerequisites

- RuoYi-Vue-Plus-Legal 服务运行正常
- Sa-Token v1.44.0 (项目已满足)
- 网络可达性 (ai-chatbot ↔ RuoYi)
