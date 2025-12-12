## ADDED Requirements

### Requirement: Conversation Embedding Storage
系统 SHALL 支持将对话内容向量化并存储，以实现语义记忆。

#### Scenario: Generate embedding for message
- **WHEN** 用户发送消息或 Agent 回复
- **THEN** 系统 SHALL 生成消息的 Embedding 向量
- **AND** 将向量存储到数据库

#### Scenario: Embedding model selection
- **WHEN** 生成 Embedding
- **THEN** 系统 SHALL 使用 OpenAI text-embedding-3-small 模型
- **AND** 生成 1536 维向量

#### Scenario: Batch embedding generation
- **WHEN** 需要处理多条消息
- **THEN** 系统 SHALL 支持批量生成 Embedding
- **AND** 单次最多处理 100 条

### Requirement: Semantic Memory Search
系统 SHALL 支持基于语义相似度检索历史对话。

#### Scenario: Search similar conversations
- **WHEN** Agent 需要检索相关历史
- **THEN** 系统 SHALL:
  1. 将当前查询向量化
  2. 在向量数据库中检索相似内容
  3. 返回 top-k 最相关的历史记录

#### Scenario: Filter by chat session
- **WHEN** 执行语义检索
- **THEN** 系统 SHALL 支持按 chatId 过滤
- **AND** 只返回当前会话或用户的历史

#### Scenario: Similarity threshold
- **WHEN** 返回检索结果
- **THEN** 系统 SHALL 过滤相似度低于阈值（默认 0.7）的结果
- **AND** 结果按相似度降序排列

#### Scenario: Return format
- **WHEN** 检索完成
- **THEN** 结果 SHALL 包含:
  - 原始消息内容
  - 相似度分数
  - 消息时间戳
  - 关联的 chatId

### Requirement: Conversation Summarization
系统 SHALL 支持对长对话进行自动摘要。

#### Scenario: Trigger summarization
- **WHEN** 对话消息数超过阈值（默认 20 条）
- **THEN** 系统 SHALL 自动触发摘要生成

#### Scenario: Generate summary
- **WHEN** 执行摘要
- **THEN** 系统 SHALL:
  - 提取对话的关键信息和结论
  - 保留重要的法律条文引用
  - 生成简洁的摘要（不超过 500 字）

#### Scenario: Store summary
- **WHEN** 摘要生成完成
- **THEN** 系统 SHALL:
  - 将摘要存储为特殊类型的消息
  - 为摘要生成 Embedding
  - 标记已摘要的原始消息

#### Scenario: Use summary as context
- **WHEN** Agent 处理新消息
- **AND** 对话已有摘要
- **THEN** 系统 SHALL 使用摘要替代完整历史
- **AND** 保持上下文窗口在合理范围内

### Requirement: Cross-Agent Context Sharing
系统 SHALL 支持多个 Agent 之间共享上下文信息。

#### Scenario: Store shared context
- **WHEN** 用户提供案情背景
- **THEN** 系统 SHALL 将关键信息存储为共享上下文
- **AND** 分配唯一的上下文 ID

#### Scenario: Access shared context
- **WHEN** Agent 需要获取共享上下文
- **THEN** 系统 SHALL 提供 `fetchContext` 工具
- **AND** 根据上下文 ID 返回相关信息

#### Scenario: Update shared context
- **WHEN** Agent 产生新的重要发现
- **THEN** Agent MAY 调用 `updateContext` 工具
- **AND** 将新信息追加到共享上下文

### Requirement: Vector Database Schema
系统 SHALL 使用 PostgreSQL + pgvector 实现向量存储。

#### Scenario: Create embedding table
- **WHEN** 初始化数据库
- **THEN** 系统 SHALL 创建 `conversation_embeddings` 表
- **AND** 包含字段:
  - id (主键)
  - chat_id (外键)
  - content (原文)
  - embedding (vector(1536))
  - message_type (user/assistant/summary)
  - created_at (时间戳)

#### Scenario: Create vector index
- **WHEN** 表创建完成
- **THEN** 系统 SHALL 创建 HNSW 或 IVFFlat 向量索引
- **AND** 优化检索性能

#### Scenario: Implement RPC function
- **WHEN** 执行语义检索
- **THEN** 系统 SHALL 通过 PostgreSQL RPC 函数执行
- **AND** 函数名为 `match_conversations`
- **AND** 支持参数: query_embedding, match_count, filter

### Requirement: Memory Retention Policy
系统 SHALL 实现记忆保留策略。

#### Scenario: Archive old embeddings
- **WHEN** Embedding 记录超过保留期（默认 90 天）
- **THEN** 系统 MAY 将其归档或删除
- **AND** 保留摘要类型的 Embedding

#### Scenario: User data deletion
- **WHEN** 用户请求删除数据
- **THEN** 系统 SHALL 删除该用户所有的 Embedding 记录
- **AND** 确保符合隐私合规要求
