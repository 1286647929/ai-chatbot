## ADDED Requirements

### Requirement: Intent Classification System
系统 SHALL 提供两层意图识别机制，用于分析用户法律问题并路由到专业 Agent。

#### Scenario: Rule-based classification with high confidence
- **WHEN** 用户消息包含明确的法律关键词（如"案例"、"法条"、"起诉状"）
- **AND** 规则匹配置信度 >= 0.85
- **THEN** 系统直接返回分类结果，不调用 LLM

#### Scenario: LLM classification fallback
- **WHEN** 规则匹配置信度 < 0.85
- **THEN** 系统调用 intent-model 进行 LLM 分类
- **AND** 返回包含 intent、category、confidence、entities 的结构化结果

#### Scenario: Classification result structure
- **WHEN** 分类完成
- **THEN** 结果 SHALL 包含:
  - `intent`: 主意图类别（legal_consultation | case_search | regulation_query | document_draft | contract_review | general_chat）
  - `category`: 细分类别（如 labor_law, civil_law）
  - `confidence`: 置信度分数 (0-1)
  - `entities`: 提取的关键实体数组

### Requirement: Multi-Agent Router
系统 SHALL 根据意图分类结果将请求路由到对应的专业 Agent。

#### Scenario: Route to Legal Research Agent
- **WHEN** intent 为 `legal_consultation` 或 `regulation_query`
- **THEN** 系统路由到 Legal Research Agent
- **AND** 配置法规检索工具集

#### Scenario: Route to Case Analysis Agent
- **WHEN** intent 为 `case_search`
- **THEN** 系统路由到 Case Analysis Agent
- **AND** 配置案例检索工具集

#### Scenario: Route to Document Draft Agent
- **WHEN** intent 为 `document_draft`
- **THEN** 系统路由到 Document Draft Agent
- **AND** 配置文档创建工具

#### Scenario: Default route fallback
- **WHEN** intent 为 `general_chat` 或无法识别
- **THEN** 系统使用默认 chat-model 处理
- **AND** 保持现有单 Agent 行为

### Requirement: Legal Research Agent
系统 SHALL 提供专门处理法律研究请求的 Agent。

#### Scenario: Process legal consultation
- **WHEN** 路由到 Legal Research Agent
- **THEN** Agent SHALL 使用法律研究专用 system prompt
- **AND** 可调用 regulationSearch、webSearch 工具
- **AND** 以结构化格式输出法律依据

#### Scenario: Citation formatting
- **WHEN** Agent 引用法律条文
- **THEN** SHALL 使用标准引用格式：《法律名称》第X条
- **AND** 包含法条原文摘要

### Requirement: Case Analysis Agent
系统 SHALL 提供专门处理案例分析请求的 Agent。

#### Scenario: Search similar cases
- **WHEN** 用户请求查找类似案例
- **THEN** Agent SHALL 调用 caseSearch 工具
- **AND** 返回相关案例列表
- **AND** 包含案例摘要和判决要点

#### Scenario: Case comparison
- **WHEN** Agent 分析多个案例
- **THEN** SHALL 生成对比分析
- **AND** 指出关键差异和参考价值

### Requirement: Document Draft Agent
系统 SHALL 提供专门处理法律文书起草请求的 Agent。

#### Scenario: Draft legal document
- **WHEN** 用户请求起草法律文书
- **THEN** Agent SHALL 确认文书类型（起诉状、合同、律师函等）
- **AND** 收集必要信息
- **AND** 使用 createDocument 工具生成文书

#### Scenario: Template selection
- **WHEN** Agent 准备起草文书
- **THEN** SHALL 基于文书类型选择合适的模板
- **AND** 根据用户提供的信息填充内容

### Requirement: Agent Status Streaming
系统 SHALL 通过流式响应传递 Agent 工作状态。

#### Scenario: Emit classification status
- **WHEN** 开始意图分类
- **THEN** 系统 SHALL 向客户端发送 `{ type: 'status', status: 'classifying' }`

#### Scenario: Emit agent selection
- **WHEN** Agent 路由完成
- **THEN** 系统 SHALL 发送 `{ type: 'agent-selected', agent: string, confidence: number }`

#### Scenario: Emit agent thinking
- **WHEN** Agent 正在处理请求
- **THEN** 系统 MAY 发送中间思考状态
- **AND** 保持流式输出

### Requirement: Legal Disclaimer
系统 SHALL 在法律相关回答中包含免责声明。

#### Scenario: Add disclaimer to legal advice
- **WHEN** Agent 提供法律建议
- **THEN** 回答末尾 SHALL 包含免责声明
- **AND** 声明内容提示用户咨询专业律师

#### Scenario: Disclaimer visibility
- **WHEN** 显示免责声明
- **THEN** SHALL 使用明显但不干扰阅读的样式

### Requirement: Parallel Agent Execution
系统 SHALL 支持多个 Agent 并行执行以处理跨领域问题。

#### Scenario: Detect multi-domain question
- **WHEN** 用户问题涉及多个法律领域
- **THEN** 系统 SHALL 识别所有相关领域
- **AND** 决定是否并行执行多个 Agent

#### Scenario: Execute agents in parallel
- **WHEN** 需要并行执行多个 Agent
- **THEN** 系统 SHALL 使用 Promise.allSettled 并行调用
- **AND** 每个 Agent 有独立的超时限制（默认 30 秒）

#### Scenario: Handle partial success
- **WHEN** 部分 Agent 成功、部分失败
- **THEN** 系统 SHALL 返回成功的结果
- **AND** 标注哪些部分暂时不可用

#### Scenario: Summarize parallel results
- **WHEN** 并行执行完成
- **THEN** Orchestrator Agent SHALL 整合各专家结果
- **AND** 生成统一的综合回答

### Requirement: Agent Error Handling
系统 SHALL 优雅处理 Agent 执行过程中的错误。

#### Scenario: Handle agent timeout
- **WHEN** Agent 执行超过超时时间
- **THEN** 系统 SHALL 中断该 Agent
- **AND** 返回部分结果或降级提示
- **AND** 不影响其他 Agent 执行

#### Scenario: Handle tool execution failure
- **WHEN** Agent 调用的工具执行失败
- **THEN** 系统 SHALL 重试一次
- **AND** 如仍失败，跳过该工具继续执行
- **AND** 在最终结果中说明

#### Scenario: Fallback to general agent
- **WHEN** 专业 Agent 完全失败
- **THEN** 系统 SHALL 降级到通用 Agent
- **AND** 提供基础回答
- **AND** 建议用户稍后重试或咨询专业律师

#### Scenario: User-friendly error messages
- **WHEN** 发生错误
- **THEN** 系统 SHALL 返回用户可理解的错误提示
- **AND** 避免暴露技术细节

### Requirement: Agent Execution Tracing
系统 SHALL 记录 Agent 执行的完整追踪信息。

#### Scenario: Generate trace ID
- **WHEN** 开始处理用户请求
- **THEN** 系统 SHALL 生成唯一的 traceId
- **AND** 关联到整个处理流程

#### Scenario: Record decision chain
- **WHEN** 执行过程中
- **THEN** 系统 SHALL 记录:
  - 意图分类结果
  - 路由决策
  - 选择的 Agent 列表
  - 每个 Agent 的执行状态

#### Scenario: Record tool calls
- **WHEN** Agent 调用工具
- **THEN** 系统 SHALL 记录:
  - 工具名称
  - 输入参数
  - 输出结果
  - 执行时长

#### Scenario: Store trace data
- **WHEN** 请求处理完成
- **THEN** 系统 SHALL 将追踪数据持久化到数据库
- **AND** 支持后续查询和审计

### Requirement: Agent Class Encapsulation
系统 SHALL 使用 AI SDK 的 Agent 类封装各专业 Agent。

#### Scenario: Define agent with Agent class
- **WHEN** 创建专业 Agent
- **THEN** 系统 SHALL 使用 AI SDK Agent 类
- **AND** 配置 name、model、system prompt、tools

#### Scenario: Agent context sharing
- **WHEN** Agent 需要访问共享上下文
- **THEN** Agent 可通过 context 参数获取
- **AND** 上下文包含用户背景、案情要点等

#### Scenario: Agent handover
- **WHEN** Agent 需要将任务传递给另一 Agent
- **THEN** 系统 SHALL 支持 handover 机制
- **AND** 携带必要的上下文信息
