## 1. RuoYi OAuth2 服务端实现

### 1.1 依赖配置
- [ ] 1.1.1 在 `ruoyi-admin/pom.xml` 添加 `sa-token-oauth2` 依赖
- [ ] 1.1.2 验证依赖版本与现有 Sa-Token (v1.44.0) 兼容

### 1.2 OAuth2 配置
- [ ] 1.2.1 在 `application.yml` 添加 OAuth2 配置项 (授权码模式、token 超时等)
- [ ] 1.2.2 配置安全路径排除 `/oauth2/**`

### 1.3 OAuth2 控制器
- [ ] 1.3.1 创建 `OAuth2ServerController.java` 处理 OAuth2 请求
- [ ] 1.3.2 实现 `/oauth2/userinfo` 端点返回用户信息

### 1.4 客户端注册
- [ ] 1.4.1 创建 `SaOAuth2ServerConfig.java` 配置类
- [ ] 1.4.2 注册 ai-chatbot 客户端 (clientId, clientSecret, redirectUri, scopes)
- [ ] 1.4.3 实现 `doLoginHandle` 复用现有认证逻辑

### 1.5 授权视图
- [ ] 1.5.1 创建授权确认页面 (可选，支持自动确认)

## 2. ai-chatbot OAuth2 客户端实现

### 2.1 环境变量
- [ ] 2.1.1 添加 `RUOYI_OAUTH2_BASE_URL` 环境变量
- [ ] 2.1.2 添加 `RUOYI_CLIENT_ID` 环境变量
- [ ] 2.1.3 添加 `RUOYI_CLIENT_SECRET` 环境变量
- [ ] 2.1.4 更新 `.env.example` 文档

### 2.2 NextAuth 配置
- [ ] 2.2.1 在 `app/(auth)/auth.ts` 添加 RuoYi OAuth2 Provider
- [ ] 2.2.2 实现 `profile` 回调映射用户信息
- [ ] 2.2.3 实现 `jwt` 回调存储 access_token
- [ ] 2.2.4 更新 `auth.config.ts` 回调路由

### 2.3 用户同步 (可选)
- [ ] 2.3.1 添加 `externalUserId` 字段到 User 表
- [ ] 2.3.2 实现首次登录自动创建本地用户
- [ ] 2.3.3 生成数据库迁移文件

## 3. 测试与验证

### 3.1 单元测试
- [ ] 3.1.1 测试 OAuth2 授权码流程
- [ ] 3.1.2 测试 token 刷新逻辑

### 3.2 集成测试
- [ ] 3.2.1 端到端登录流程测试
- [ ] 3.2.2 测试无效 token 处理
- [ ] 3.2.3 测试 RuoYi 服务不可用时的降级处理

## 4. 文档更新

- [ ] 4.1 更新 `CLAUDE.md` 添加 OAuth2 配置说明
- [ ] 4.2 更新 `openspec/project.md` 添加认证架构说明

## Dependencies

- Task 2.x 依赖 Task 1.x 完成 (RuoYi 服务端先行)
- Task 3.x 依赖 Task 1.x 和 2.x 完成
- Task 1.1-1.4 可并行开发
- Task 2.1-2.2 可并行开发
