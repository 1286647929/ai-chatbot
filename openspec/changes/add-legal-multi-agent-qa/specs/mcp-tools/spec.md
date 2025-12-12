## ADDED Requirements

### Requirement: MCP Client Integration
系统 SHALL 支持通过 MCP (Model Context Protocol) 连接外部工具服务。

#### Scenario: Initialize MCP client
- **WHEN** 系统启动且配置了 MCP 服务端点
- **THEN** 系统 SHALL 初始化 MCP 客户端连接
- **AND** 验证连接可用性

#### Scenario: MCP connection via SSE
- **WHEN** MCP 服务配置为 SSE 传输
- **THEN** 系统 SHALL 使用 Server-Sent Events 建立连接
- **AND** 维护连接心跳

#### Scenario: MCP connection via Stdio
- **WHEN** MCP 服务配置为 Stdio 传输
- **THEN** 系统 SHALL 通过标准输入输出与 MCP 服务通信

#### Scenario: MCP connection failure
- **WHEN** MCP 服务连接失败
- **THEN** 系统 SHALL 记录错误日志
- **AND** 降级到本地工具
- **AND** 不中断主要功能

### Requirement: MCP Tool Discovery
系统 SHALL 自动发现 MCP 服务提供的工具。

#### Scenario: List available tools
- **WHEN** MCP 客户端连接成功
- **THEN** 系统 SHALL 获取可用工具列表
- **AND** 缓存工具定义

#### Scenario: Tool schema parsing
- **WHEN** 获取 MCP 工具定义
- **THEN** 系统 SHALL 解析工具的:
  - 名称和描述
  - 输入参数 schema
  - 返回值 schema

#### Scenario: Tool registration
- **WHEN** MCP 工具发现完成
- **THEN** 系统 SHALL 将 MCP 工具转换为 AI SDK tool 格式
- **AND** 注册到 Agent 可用工具集

### Requirement: MCP Tool Invocation
系统 SHALL 支持通过 MCP 协议调用外部工具。

#### Scenario: Invoke MCP tool
- **WHEN** Agent 决定调用 MCP 工具
- **THEN** 系统 SHALL 通过 MCP 协议发送调用请求
- **AND** 等待工具执行结果

#### Scenario: Tool invocation timeout
- **WHEN** MCP 工具调用超过配置的超时时间
- **THEN** 系统 SHALL 中断调用
- **AND** 返回超时错误
- **AND** Agent 可选择备用方案

#### Scenario: Tool result processing
- **WHEN** MCP 工具返回结果
- **THEN** 系统 SHALL 解析结果
- **AND** 转换为 Agent 可理解的格式

### Requirement: Legal Knowledge MCP Server
系统 SHALL 支持连接专门的法律知识 MCP 服务（当配置可用时）。

#### Scenario: Legal database query
- **WHEN** 连接法律知识 MCP 服务
- **THEN** 系统 SHALL 可调用:
  - 法规数据库查询工具
  - 案例库检索工具
  - 法律文书模板工具

#### Scenario: Knowledge source attribution
- **WHEN** 使用 MCP 法律知识服务返回的数据
- **THEN** 系统 SHALL 标注数据来源
- **AND** 包含更新时间信息

### Requirement: MCP Configuration
系统 SHALL 支持灵活的 MCP 服务配置。

#### Scenario: Environment variable configuration
- **WHEN** 配置 MCP 服务
- **THEN** 系统 SHALL 支持通过环境变量配置:
  - `LEGAL_MCP_SERVER_URL`: MCP 服务端点
  - `LEGAL_MCP_TRANSPORT`: 传输方式 (sse | stdio)
  - `LEGAL_MCP_TIMEOUT`: 超时时间（毫秒）

#### Scenario: Multiple MCP servers
- **WHEN** 配置多个 MCP 服务
- **THEN** 系统 SHALL 支持同时连接多个服务
- **AND** 合并各服务提供的工具

#### Scenario: MCP server health check
- **WHEN** 系统运行中
- **THEN** 系统 MAY 定期检查 MCP 服务健康状态
- **AND** 在服务不可用时自动切换到备用方案

### Requirement: MCP Error Handling
系统 SHALL 优雅处理 MCP 相关错误。

#### Scenario: Connection lost
- **WHEN** MCP 连接中断
- **THEN** 系统 SHALL 尝试自动重连
- **AND** 在重连期间使用缓存的工具定义
- **AND** 向 Agent 报告连接状态

#### Scenario: Tool execution error
- **WHEN** MCP 工具执行返回错误
- **THEN** 系统 SHALL 将错误信息传递给 Agent
- **AND** Agent 可决定重试或使用替代方案

#### Scenario: Schema validation error
- **WHEN** 工具输入不符合 MCP 定义的 schema
- **THEN** 系统 SHALL 在调用前验证并拒绝无效输入
- **AND** 返回清晰的验证错误信息
