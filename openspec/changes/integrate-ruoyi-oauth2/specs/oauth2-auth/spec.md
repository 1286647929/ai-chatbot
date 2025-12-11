## ADDED Requirements

### Requirement: OAuth2 Authorization Code Authentication

用户 SHALL 能够通过 RuoYi OAuth2 授权服务器进行身份认证，使用标准 OAuth2 授权码流程登录 ai-chatbot。

#### Scenario: 用户首次 OAuth2 登录成功
- **GIVEN** RuoYi OAuth2 服务器正常运行
- **AND** 用户在 RuoYi 系统中存在有效账号
- **WHEN** 用户点击 "使用 RuoYi 登录" 按钮
- **THEN** 系统重定向到 RuoYi 授权页面
- **AND** 用户完成登录和授权后
- **THEN** 系统获取 access_token 和用户信息
- **AND** 系统在 ai-chatbot 中创建或更新本地用户记录
- **AND** 用户成功登录并重定向到聊天页面

#### Scenario: OAuth2 登录失败 - 用户取消授权
- **GIVEN** 用户已重定向到 RuoYi 授权页面
- **WHEN** 用户点击取消或拒绝授权
- **THEN** 系统重定向回 ai-chatbot 登录页面
- **AND** 显示 "授权已取消" 错误消息

#### Scenario: OAuth2 登录失败 - 无效授权码
- **GIVEN** ai-chatbot 收到授权回调
- **WHEN** 授权码无效或已过期
- **THEN** 系统显示 "登录失败，请重试" 错误消息
- **AND** 用户保持在登录页面

### Requirement: OAuth2 Token Management

系统 SHALL 管理 OAuth2 access_token 和 refresh_token，确保用户会话持续有效。

#### Scenario: Access Token 自动刷新
- **GIVEN** 用户已通过 OAuth2 登录
- **AND** access_token 即将过期
- **WHEN** 用户发起需要认证的请求
- **THEN** 系统使用 refresh_token 获取新的 access_token
- **AND** 用户请求正常完成

#### Scenario: Refresh Token 过期
- **GIVEN** 用户的 refresh_token 已过期
- **WHEN** 用户发起需要认证的请求
- **THEN** 系统清除用户会话
- **AND** 重定向用户到登录页面

### Requirement: OAuth2 User Profile Mapping

系统 SHALL 将 RuoYi 用户信息映射到 ai-chatbot 用户模型。

#### Scenario: 用户信息映射
- **GIVEN** OAuth2 认证成功
- **WHEN** 系统从 RuoYi `/oauth2/userinfo` 端点获取用户信息
- **THEN** 系统提取以下字段:
  - `userId` → `user.id` (或关联用)
  - `email` → `user.email`
  - `nickName` / `userName` → `user.name`
- **AND** 用户类型设置为 `regular`

#### Scenario: 用户信息更新
- **GIVEN** 用户已存在于 ai-chatbot 数据库
- **WHEN** 用户再次通过 OAuth2 登录
- **THEN** 系统更新本地用户的 email 和 name (如有变化)

### Requirement: OAuth2 Server Configuration (RuoYi)

RuoYi 系统 SHALL 提供符合 OAuth2 规范的授权服务器端点。

#### Scenario: 授权端点可访问
- **GIVEN** RuoYi 服务正常运行
- **WHEN** 客户端访问 `/oauth2/authorize` 端点
- **THEN** 系统返回授权页面或重定向到登录页面

#### Scenario: Token 端点可访问
- **GIVEN** 客户端拥有有效的授权码
- **WHEN** 客户端 POST 请求 `/oauth2/token` 端点
- **WITH** `grant_type=authorization_code`
- **AND** `code=<授权码>`
- **AND** `client_id` 和 `client_secret`
- **THEN** 系统返回 JSON 包含:
  - `access_token`
  - `refresh_token`
  - `token_type: "Bearer"`
  - `expires_in`

#### Scenario: 用户信息端点可访问
- **GIVEN** 客户端拥有有效的 access_token
- **WHEN** 客户端 GET 请求 `/oauth2/userinfo` 端点
- **WITH** `Authorization: Bearer <access_token>` header
- **THEN** 系统返回 JSON 包含用户信息

### Requirement: OAuth2 Client Registration

ai-chatbot SHALL 在 RuoYi OAuth2 服务器中注册为有效客户端。

#### Scenario: 客户端配置
- **GIVEN** ai-chatbot 客户端已注册
- **WHEN** 查看客户端配置
- **THEN** 配置包含:
  - `clientId`: 唯一标识符
  - `clientSecret`: 安全密钥
  - `redirectUris`: 包含 `http://localhost:3000/api/auth/callback/ruoyi`
  - `scopes`: 包含 `openid`, `userinfo`, `email`
  - `grantTypes`: 包含 `authorization_code`, `refresh_token`

### Requirement: Fallback Authentication

系统 SHALL 在 OAuth2 服务不可用时提供替代登录方式。

#### Scenario: OAuth2 服务不可用
- **GIVEN** RuoYi OAuth2 服务器不可达
- **WHEN** 用户尝试 OAuth2 登录
- **THEN** 系统显示友好错误消息
- **AND** 提供游客登录选项 (如已启用)

#### Scenario: 保留游客登录
- **GIVEN** 系统配置了 OAuth2 和游客登录
- **WHEN** 用户访问登录页面
- **THEN** 用户可以选择:
  - "使用 RuoYi 账号登录"
  - "以游客身份继续"
