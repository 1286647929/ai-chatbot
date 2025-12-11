## Context

### 背景
ai-chatbot 项目需要与 RuoYi-Vue-Plus-Legal 后端系统实现统一身份认证。RuoYi 使用 Sa-Token (v1.44.0) 作为认证框架，支持 OAuth2 模块扩展。

### 约束条件
- RuoYi 项目路径: `/home/aycole/ideaProgram/RuoYi-Vue-Plus-Legal`
- ai-chatbot 项目路径: `/home/aycole/ideaProgram/ai-chatbot`
- 两个项目需要网络可达
- 使用 OAuth2 授权码模式 (Authorization Code Flow)

### 相关方
- ai-chatbot 开发者
- RuoYi 系统管理员
- 终端用户

## Goals / Non-Goals

### Goals
- 实现 OAuth2 授权码模式，用户通过 RuoYi 账号登录 ai-chatbot
- 保持 ai-chatbot 现有功能不变
- 支持 token 自动刷新
- 用户信息从 RuoYi 同步到 ai-chatbot

### Non-Goals
- 不实现双向用户同步 (ai-chatbot → RuoYi)
- 不实现 OAuth2 密码模式或客户端凭证模式
- 不实现多租户支持 (当前阶段)
- 不修改 RuoYi 现有用户表结构

## Decisions

### Decision 1: 使用 Sa-Token OAuth2 模块

**选择**: 使用 Sa-Token 内置的 `sa-token-oauth2` 模块

**原因**:
- RuoYi 已集成 Sa-Token v1.44.0，版本兼容
- 相比 Spring Authorization Server，配置更简单
- 官方文档完善，社区活跃

**替代方案**:
- Spring Authorization Server: 配置复杂，需要额外依赖
- 直接 JWT 交换: 非标准 OAuth2，不利于扩展

### Decision 2: 授权码模式 (Authorization Code)

**选择**: 仅启用授权码模式

**原因**:
- 最安全的 OAuth2 模式，适合 Web 应用
- 前端不接触用户密码
- 支持 refresh_token

**替代方案**:
- 密码模式: 安全性较低，不推荐
- 隐式模式: 已被 OAuth2.1 废弃

### Decision 3: NextAuth OAuth2 Provider

**选择**: 使用 NextAuth 自定义 OAuth2 Provider

**原因**:
- ai-chatbot 已集成 NextAuth v5
- 支持自定义 OAuth2 端点配置
- 内置 token 刷新机制

### Decision 4: 用户映射策略

**选择**: 使用 email 作为用户关联键，首次登录自动创建本地用户

**原因**:
- email 在两个系统中都是唯一标识
- 避免复杂的用户 ID 映射
- 保持现有 User 表结构不变

**替代方案**:
- 使用 externalUserId 字段: 需要修改 schema，增加复杂度

## Architecture

```
┌──────────────────┐         ┌──────────────────────────┐
│   ai-chatbot     │         │  RuoYi-Vue-Plus-Legal    │
│  (OAuth2 Client) │         │  (OAuth2 Auth Server)    │
├──────────────────┤         ├──────────────────────────┤
│ NextAuth         │         │ Sa-Token OAuth2          │
│ - RuoYi Provider │◄───────►│ - /oauth2/authorize      │
│ - JWT Callbacks  │         │ - /oauth2/token          │
│ - Session Mgmt   │         │ - /oauth2/userinfo       │
├──────────────────┤         ├──────────────────────────┤
│ PostgreSQL       │         │ MySQL/PostgreSQL         │
│ - User           │         │ - sys_user               │
│ - Chat           │         │ - sys_client             │
│ - Message_v2     │         │                          │
└──────────────────┘         └──────────────────────────┘
```

### OAuth2 授权码流程

```
User          ai-chatbot         RuoYi OAuth2
 │                 │                   │
 │  1. 点击登录    │                   │
 ├────────────────►│                   │
 │                 │  2. 重定向到授权页 │
 │◄────────────────┼──────────────────►│
 │                 │                   │
 │  3. 用户登录并授权                  │
 ├────────────────────────────────────►│
 │                 │                   │
 │  4. 重定向回 callback (带 code)     │
 │◄────────────────────────────────────┤
 │                 │                   │
 │                 │  5. code 换 token │
 │                 ├──────────────────►│
 │                 │◄──────────────────┤
 │                 │  (access_token)   │
 │                 │                   │
 │                 │  6. 获取用户信息  │
 │                 ├──────────────────►│
 │                 │◄──────────────────┤
 │                 │  (userinfo)       │
 │                 │                   │
 │  7. 登录成功    │                   │
 │◄────────────────┤                   │
```

## Risks / Trade-offs

### Risk 1: RuoYi 服务不可用
- **影响**: ai-chatbot 无法登录
- **缓解**: 添加健康检查和友好错误提示

### Risk 2: Token 过期处理
- **影响**: 用户会话中断
- **缓解**: 使用 refresh_token 自动刷新

### Risk 3: 用户数据一致性
- **影响**: 用户信息变更后不同步
- **缓解**: 每次登录时更新本地用户信息

## Migration Plan

### 阶段 1: 并行运行 (推荐)
1. 保留现有 Credentials Provider
2. 添加 RuoYi OAuth2 Provider
3. 用户可选择任一方式登录

### 阶段 2: 完全迁移 (可选)
1. 移除 Credentials Provider
2. 仅保留 OAuth2 登录
3. 迁移现有用户

### 回滚计划
- 移除 RuoYi OAuth2 Provider 配置
- 恢复 Credentials Provider 为默认

## Open Questions

1. **游客登录如何处理?**
   - 建议: 保留现有 guest provider，OAuth2 仅用于正式用户

2. **是否需要支持多租户?**
   - 当前: 不支持
   - 后续: 可通过 tenantId 扩展

3. **token 有效期如何配置?**
   - 建议: access_token 2小时，refresh_token 30天
