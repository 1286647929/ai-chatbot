# Tasks: 多 Agent 法律智能问答系统

## 1. 基础设施

- [x] 1.1 扩展 `lib/ai/providers.ts` 添加新模型配置
  - 添加 `intent-model` (意图识别)
  - 添加 `legal-research-model` (法律研究)
  - 添加 `case-analysis-model` (案例分析)
  - 添加 `document-draft-model` (文书起草)

- [x] 1.2 创建类型定义 `lib/ai/agents/types.ts`
  - 定义 `LegalAgent` 接口
  - 定义 `AgentInput` / `AgentOutput` 类型
  - 定义 `AgentContext` 类型

- [x] 1.3 创建意图类型定义 `lib/ai/intent/schema.ts`
  - 定义 `IntentSchema` (Zod schema)
  - 定义 `Intent` 类型
  - 定义法律意图分类枚举

## 2. 意图识别系统

- [x] 2.1 实现规则匹配层 `lib/ai/intent/rules.ts`
  - 定义关键词规则映射
  - 实现 `ruleBasedClassify` 函数
  - 配置置信度阈值

- [x] 2.2 实现 LLM 分类层 `lib/ai/intent/classifier.ts`
  - 实现 `llmClassify` 函数 (使用 generateObject)
  - 实现组合分类器 `classifyIntent`
  - 添加分类结果日志

## 3. Agent 框架

- [x] 3.1 创建 Agent 注册表 `lib/ai/router/registry.ts`
  - 定义 Agent 配置结构
  - 注册各专业 Agent 配置
  - 配置 Agent 对应的模型和工具

- [x] 3.2 实现路由调度器 `lib/ai/router/index.ts`
  - 实现 `routeToAgent` 函数
  - 集成意图识别
  - 返回 Agent 配置

- [x] 3.3 实现 Router Agent `lib/ai/agents/router.ts`
  - 定义路由 system prompt
  - 实现路由决策逻辑

- [x] 3.4 实现 Legal Research Agent `lib/ai/agents/legal-research.ts`
  - 定义法律研究 system prompt
  - 配置检索工具集

- [x] 3.5 实现 Case Analysis Agent `lib/ai/agents/case-analysis.ts`
  - 定义案例分析 system prompt
  - 配置案例检索工具

- [x] 3.6 实现 Legal Advisor Agent `lib/ai/agents/legal-advisor.ts`
  - 定义法律顾问 system prompt
  - 实现综合分析逻辑

- [x] 3.7 实现 Document Draft Agent `lib/ai/agents/document-draft.ts`
  - 定义文书起草 system prompt
  - 集成 createDocument 工具

## 4. 法律工具

- [x] 4.1 实现 Web Search 工具 `lib/ai/tools/legal/web-search.ts`
  - 定义 tool schema
  - 实现搜索 API 调用（支持 Perplexity/Exa/Tavily/SerpAPI）
  - 添加结果格式化

- [x] 4.2 实现 Regulation Search 工具 `lib/ai/tools/legal/regulation-search.ts`
  - 定义法规搜索 schema
  - 实现法规数据源调用
  - 添加法条引用格式化

- [x] 4.3 实现 Case Search 工具 `lib/ai/tools/legal/case-search.ts`
  - 定义案例搜索 schema
  - 实现案例数据源调用
  - 添加案例摘要格式化

- [x] 4.4 创建工具导出索引 `lib/ai/tools/legal/index.ts`

## 5. MCP 集成

- [x] 5.1 安装 `@ai-sdk/mcp` 依赖

- [x] 5.2 创建 MCP 客户端 `lib/ai/tools/mcp/client.ts`
  - 配置 MCP 连接
  - 实现工具转换函数
  - 添加错误处理

## 6. 法律 Prompts

- [x] 6.1 创建路由 prompt `lib/ai/prompts/legal/router.ts`

- [x] 6.2 创建法律研究 prompt `lib/ai/prompts/legal/research.ts`

- [x] 6.3 创建案例分析 prompt `lib/ai/prompts/legal/case-analysis.ts`

- [x] 6.4 创建法律顾问 prompt `lib/ai/prompts/legal/advisor.ts`

- [x] 6.5 创建文书起草 prompt `lib/ai/prompts/legal/document-draft.ts`

## 7. Chat Route 集成

- [x] 7.1 修改 `app/(chat)/api/chat/route.ts`
  - 添加 agentMode 参数解析
  - 集成 routeToAgent 调用
  - 动态选择模型和工具

- [x] 7.2 修改 `app/(chat)/api/chat/schema.ts`
  - 添加 agentMode 字段
  - 更新请求验证 schema

- [x] 7.3 添加环境变量开关
  - `ENABLE_MULTI_AGENT` 控制功能启用

## 8. UI 组件

- [x] 8.1 创建 Agent 状态组件 `components/agent-status.tsx`
  - 显示当前 Agent 名称
  - 显示分类置信度
  - 添加状态切换动画

- [x] 8.2 创建法律引用卡片 `components/legal-citation.tsx`
  - 法规引用样式
  - 案例引用样式
  - 展开/折叠交互

- [x] 8.3 集成到消息组件
  - 修改 `components/message.tsx`
  - 添加 Agent 状态渲染
  - 添加引用卡片渲染

## 9. 前端集成

- [x] 9.1 修改 `hooks/use-chat.ts` 或相关 hook
  - 处理 Agent 状态事件
  - 更新 UI 状态

- [x] 9.2 修改聊天页面
  - 添加多 Agent 模式切换
  - 显示 Agent 工作状态

## 10. 测试

- [ ] 10.1 编写意图识别单元测试

- [ ] 10.2 编写 Agent 路由单元测试

- [ ] 10.3 编写法律工具集成测试

- [ ] 10.4 编写端到端测试用例

## 11. 文档与配置

- [ ] 11.1 添加搜索 API 配置文档

- [x] 11.2 更新 `.env.example` 添加新环境变量

- [x] 11.3 添加免责声明文本配置
  - 创建 `lib/ai/prompts/legal/disclaimer.ts`
  - 定义完整版/简短版免责声明
  - 定义紧急情况/诉讼时效/刑事案件提示

## 12. 向量存储与语义记忆（新增）

- [ ] 12.1 安装 pgvector 扩展
  - 在 PostgreSQL 中启用 pgvector
  - 或使用 Supabase 内置向量功能

- [ ] 12.2 创建 Embedding 表 `lib/db/schema.ts`
  - 添加 `conversation_embeddings` 表
  - 定义 vector 列类型
  - 创建向量索引

- [ ] 12.3 实现 Embedding 生成 `lib/ai/embedding/index.ts`
  - 使用 OpenAI text-embedding-3-small
  - 实现批量 Embedding 生成
  - 添加错误处理

- [ ] 12.4 实现语义检索 `lib/ai/memory/semantic-search.ts`
  - 实现 `matchConversations` RPC 函数
  - 支持按 chatId 过滤
  - 支持相似度阈值

- [ ] 12.5 实现对话摘要 `lib/ai/memory/summarize.ts`
  - 长对话自动摘要
  - 保留关键信息
  - 定期执行摘要任务

## 13. 缓存系统（新增）

- [x] 13.1 项目已包含 Redis 依赖
  - 使用 `redis` 包 (^5.0.0)
  - 配置 `REDIS_URL` 环境变量

- [x] 13.2 实现内存缓存层 `lib/cache/memory.ts`
  - LRU 缓存实现
  - 最大 100 条记录
  - 5 分钟 TTL

- [x] 13.3 实现持久缓存层 `lib/cache/redis.ts`
  - 查询归一化函数
  - 分类型 TTL 配置
  - 缓存命中统计

- [x] 13.4 集成缓存中间件
  - 搜索工具缓存包装（web-search.ts）
  - TieredCache 分层缓存
  - 缓存状态日志

## 14. Word 文书生成（新增）

- [ ] 14.1 安装 docx 依赖（可选，当前使用 Markdown 格式）
  ```bash
  pnpm add docx
  ```

- [x] 14.2 创建文书模板库 `lib/templates/`
  - 租赁合同模板
  - 民事起诉状模板
  - 律师函模板
  - 其他模板待扩展

- [x] 14.3 实现模板填充 `lib/ai/tools/legal/document-generator.ts`
  - 模板加载函数
  - 占位符替换逻辑
  - 数据验证

- [x] 14.4 实现文书生成工具 `lib/ai/tools/legal/document-generator.ts`
  - listDocumentTemplates - 列出模板
  - getDocumentTemplateInfo - 获取模板详情
  - generateDocument - 生成文书（Markdown 格式）

## 15. 并行执行与编排（新增）

- [x] 15.1 实现并行 Agent 执行器 `lib/ai/orchestrator/index.ts`
  - Promise.allSettled 封装
  - 超时控制（30秒）
  - 部分成功处理

- [x] 15.2 实现结果汇总器 `lib/ai/orchestrator/index.ts`
  - 多 Agent 结果整合
  - 冲突检测与处理
  - 统一格式输出

- [x] 15.3 实现 handover 工具 `lib/ai/tools/handover.ts`
  - Agent 间任务传递
  - 上下文携带
  - createHandoverTool 工厂函数
  - 集成到各 Agent 工具集

## 16. 错误处理与降级（新增）

- [x] 16.1 定义错误类型 `lib/ai/agents/types.ts`
  - AgentTimeoutError
  - ToolExecutionError
  - SearchProviderError

- [x] 16.2 实现降级策略 `lib/ai/orchestrator/index.ts`
  - 超时降级逻辑
  - 工具失败重试
  - Agent 失败回退

- [x] 16.3 实现用户友好错误消息
  - 错误消息模板（ERROR_MESSAGES）
  - 多语言支持（待扩展）

## 17. 可观察性（新增）

- [ ] 17.1 创建追踪表 `lib/db/schema.ts`（待实现数据库持久化）
  - 当前使用内存存储
  - 生产环境需添加数据库表

- [x] 17.2 实现追踪记录 `lib/ai/tracing/recorder.ts`
  - 生成 traceId
  - TraceRecorder 类记录 Agent 决策链
  - 记录工具调用详情
  - TraceStore 内存存储

- [x] 17.3 实现追踪查询 API `app/(chat)/api/admin/traces/route.ts`
  - 按 chatId 查询
  - 按时间范围查询
  - 按 Agent 过滤
  - 分页查询

- [ ] 17.4 创建管理后台页面（可选）
  - 追踪列表视图
  - 决策链可视化
  - Token 消耗统计

## 18. 搜索 API 集成（新增）

- [x] 18.1 实现模型原生搜索 `lib/ai/tools/legal/web-search.ts`
  - 多 API 降级策略
  - 模型能力检测（待扩展）

- [x] 18.2 实现 Perplexity 搜索 `lib/ai/tools/legal/web-search.ts`
  - 集成在 web-search.ts 中
  - 配置 API Key
  - 引用来源解析

- [x] 18.3 实现 Exa 搜索 `lib/ai/tools/legal/web-search.ts`
  - 集成在 web-search.ts 中
  - 网页内容抓取
  - 结果格式化

- [x] 18.4 实现搜索提供商管理 `lib/ai/tools/legal/web-search.ts`
  - 提供商优先级配置
  - 自动故障切换
  - 统一接口封装
