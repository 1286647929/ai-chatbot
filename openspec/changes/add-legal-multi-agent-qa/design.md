# Design: 多 Agent 法律智能问答系统

## Context

当前系统使用单一 Agent 模式处理所有用户请求。法律领域问答需要专业化处理：
- 不同类型的法律问题需要不同的处理策略
- 需要集成外部法律知识源
- 需要支持实时网络搜索获取最新信息

**约束**:
- 保持与现有 chat route 的向后兼容
- 使用 AI SDK 5.x 原生能力
- 响应延迟需控制在可接受范围内

## Goals / Non-Goals

### Goals
- 实现意图识别 + 专业 Agent 路由架构
- 支持 Web Search 和 MCP 工具集成
- 提供 Agent 状态可视化
- 保持流式响应体验

### Non-Goals
- 不构建完整的法律知识图谱
- 不提供正式的法律意见（需免责声明）
- 不自建法律数据库（使用外部 API）

## Decisions

### D1: 两层意图识别架构

**决策**: 采用 规则匹配 + LLM 分类 的两层架构

```
用户输入
    │
    ▼
┌─────────────────────────────┐
│  Layer 1: 规则匹配 (0ms)     │
│  - 关键词匹配               │
│  - 置信度阈值: 0.85          │
└────────────┬────────────────┘
             │ 未命中
             ▼
┌─────────────────────────────┐
│  Layer 2: LLM 分类 (~400ms)  │
│  - 使用 generateObject      │
│  - intent-model (轻量模型)   │
└─────────────────────────────┘
```

**理由**:
- 高频简单问题通过规则匹配可节省 LLM 调用
- LLM 分类作为兜底保证复杂问题的准确性
- 两层架构在速度和准确性间取得平衡

**备选方案**:
1. 纯 LLM 分类 - 简单但每次都有延迟
2. Embedding 相似度 - 需要维护向量库，复杂度高
3. Fine-tuned 小模型 - 需要训练数据，初期不现实

### D2: Agent 编排模式

**决策**: 采用 Orchestrator + Specialist Agents 模式

```
Router Agent
    │
    ├── Legal Research Agent (法律研究)
    │   └── tools: regulationSearch, webSearch
    │
    ├── Case Analysis Agent (案例分析)
    │   └── tools: caseSearch, webSearch
    │
    ├── Legal Advisor Agent (法律顾问)
    │   └── tools: 综合前置 Agent 结果
    │
    └── Document Draft Agent (文书起草)
        └── tools: createDocument, templateSearch
```

**理由**:
- 专业分工提高回答质量
- 可独立优化各 Agent 的 prompt 和工具
- 便于未来扩展新的专业 Agent

### D3: 模型配置策略

**决策**: 在 `providers.ts` 中为不同用途配置不同模型

```typescript
languageModels: {
  "intent-model": newapi("gpt-4o-mini"),      // 意图识别 - 快速、低成本
  "legal-research-model": newapi("gpt-4o"),   // 法律研究 - 高质量
  "case-analysis-model": newapi("gpt-4o"),    // 案例分析 - 高质量
  "document-draft-model": newapi("gpt-4o"),   // 文书起草 - 高质量
}
```

**理由**:
- 意图识别使用轻量模型降低延迟和成本
- 专业 Agent 使用更强模型保证质量
- 配置化便于后续调整

### D4: Web Search 实现

**决策**: 使用自定义 tool 封装搜索 API

```typescript
const webSearch = tool({
  description: '搜索网络获取法律相关信息',
  inputSchema: z.object({
    query: z.string(),
    type: z.enum(['news', 'regulation', 'case', 'general'])
  }),
  execute: async ({ query, type }) => {
    // 调用 SerpAPI 或 Bing Search API
  }
});
```

**理由**:
- AI SDK 原生 tool 模式，集成简单
- 可根据类型定制搜索策略
- 便于添加缓存和限流

### D5: MCP 集成方式

**决策**: 使用 `@ai-sdk/mcp` 连接外部 MCP servers

**理由**:
- AI SDK 官方支持，兼容性好
- 可灵活扩展法律知识服务
- 支持 SSE 和 Stdio 两种传输方式
- MCP 作为"AI 领域的 USB-C"，一次集成可供任意兼容 Agent 使用

### D6: Agent 类封装策略

**决策**: 使用 AI SDK 的 Agent 类封装各专业 Agent，而非直接使用 streamText

```typescript
import { Agent } from 'ai';

const legalResearchAgent = new Agent({
  name: 'legal-research',
  model: myProvider.languageModel('legal-research-model'),
  system: legalResearchPrompt,
  tools: {
    regulationSearch,
    webSearch,
  },
});

// 方式1: 非流式调用 - 一次性返回完整结果
const result = await legalResearchAgent.generate({
  prompt: userMessage,
});
console.log(result.text);

// 方式2: 流式调用 - 实时返回文本片段 ✅ 推荐用于聊天场景
const stream = legalResearchAgent.stream({
  prompt: userMessage,
});

// 流式消费
for await (const chunk of stream.textStream) {
  // 实时输出到客户端
  dataStream.write({ type: 'text-delta', textDelta: chunk });
}
```

**两种调用方式**:
- `generate()`: 非流式，适合后台任务、需要完整结果的场景
- `stream()`: 流式输出，适合聊天界面、需要实时反馈的场景

**理由**:
- 减少样板代码，简化循环和消息管理
- 提升可复用性，每个 Agent 独立配置
- AI SDK 官方推荐的多 Agent 实现方式
- 便于实现 Agent 间的 handover 和结果传递

### D7: 向量存储与语义记忆

**决策**: 使用 PostgreSQL + pgvector 实现语义记忆

```typescript
// 存储对话 Embedding
await supabase.from('conversation_embeddings').insert({
  chat_id: chatId,
  content: message,
  embedding: await generateEmbedding(message),
  created_at: new Date(),
});

// 语义检索相关历史
const { data } = await supabase.rpc('match_conversations', {
  query_embedding: currentEmbedding,
  match_count: 5,
  filter: { chat_id: chatId }
});
```

**理由**:
- 复用现有 PostgreSQL 基础设施，无需额外向量数据库
- pgvector 性能足够支撑中小规模应用
- 支持语义检索历史对话，实现长程记忆
- Supabase 原生支持，集成成本低

**备选方案**:
1. Pinecone - 专业向量数据库，但增加运维成本
2. Milvus - 开源方案，需自建服务
3. 纯关键词检索 - 简单但语义理解能力弱

### D8: 缓存策略细化

**决策**: 实现分层缓存策略

```
┌─────────────────────────────────────────────┐
│  Layer 1: 内存缓存 (LRU)                     │
│  - 最近 100 条查询结果                       │
│  - TTL: 5 分钟                              │
└─────────────────────────────────────────────┘
                    │ miss
                    ▼
┌─────────────────────────────────────────────┐
│  Layer 2: Redis/Vercel KV                   │
│  - 查询归一化后的键值存储                     │
│  - 不同类型不同 TTL:                         │
│    - 新闻搜索: 1 小时                        │
│    - 法规搜索: 24 小时                       │
│    - 案例搜索: 6 小时                        │
└─────────────────────────────────────────────┘
```

**查询归一化**:
```typescript
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .sort()
    .join(' ');
}
```

**理由**:
- 显著降低搜索 API 调用成本
- 提升重复查询的响应速度
- 不同内容类型采用适当的缓存时长

### D9: 并行执行机制

**决策**: 支持多 Agent 并行执行与结果汇总

```typescript
async function executeParallelAgents(
  agents: Agent[],
  context: AgentContext
): Promise<AgentResult[]> {
  // 并行执行所有 Agent
  const results = await Promise.allSettled(
    agents.map(agent =>
      Promise.race([
        agent.generate({ context }),
        timeout(30000) // 30秒超时
      ])
    )
  );

  // 过滤成功结果
  return results
    .filter((r): r is PromiseFulfilledResult<AgentResult> =>
      r.status === 'fulfilled'
    )
    .map(r => r.value);
}

// 汇总 Agent 执行主 Agent 整合
async function summarizeResults(
  results: AgentResult[],
  orchestrator: Agent
): Promise<string> {
  return orchestrator.generate({
    prompt: `请整合以下各专家的分析结果，形成统一的法律建议：
    ${results.map(r => `【${r.agentName}】: ${r.content}`).join('\n\n')}`
  });
}
```

**理由**:
- 提高复杂多领域问题的处理效率
- 各 Agent 独立执行，互不阻塞
- Orchestrator 统一汇总，保证回答一致性

### D10: 错误处理与降级策略

**决策**: 实现多级降级机制

```
Agent 执行
    │
    ├─ 成功 → 返回结果
    │
    ├─ 超时 (>30s) → 降级处理
    │   ├─ 返回部分结果 + "部分信息暂时无法获取"
    │   └─ 记录超时日志
    │
    ├─ 工具调用失败 → 重试一次
    │   ├─ 重试成功 → 返回结果
    │   └─ 重试失败 → 跳过该工具，继续执行
    │
    └─ Agent 完全失败 → 降级到通用 Agent
        └─ 返回通用回答 + "建议咨询专业律师"
```

**错误响应模板**:
```typescript
const ERROR_MESSAGES = {
  timeout: '部分法律信息检索超时，以下回答基于已获取的信息。',
  tool_failure: '法规数据库暂时无法访问，建议稍后重试。',
  agent_failure: '专业分析暂时不可用，以下是通用建议。',
} as const;
```

**理由**:
- 保证系统可用性，避免单点故障
- 用户友好的错误提示
- 部分失败不影响整体响应

### D11: 可观察性设计

**决策**: 实现完整的 Agent 执行追踪

```typescript
interface AgentTrace {
  traceId: string;           // 全局追踪 ID
  chatId: string;            // 会话 ID
  timestamp: Date;
  intent: {
    classified: string;
    confidence: number;
    layer: 'rule' | 'llm';
  };
  routing: {
    selectedAgents: string[];
    reason: string;
  };
  execution: Array<{
    agentName: string;
    startTime: Date;
    endTime: Date;
    toolCalls: Array<{
      tool: string;
      input: unknown;
      output: unknown;
      duration: number;
    }>;
    tokens: { input: number; output: number };
    status: 'success' | 'timeout' | 'error';
    error?: string;
  }>;
  totalDuration: number;
  totalTokens: { input: number; output: number };
}
```

**存储方案**:
- 追踪数据存入 PostgreSQL `agent_traces` 表
- 支持按 chatId、traceId、时间范围查询
- 管理后台可查看决策链路

**理由**:
- 便于调试和性能优化
- 支持合规审计（法律场景重要）
- 可分析 Agent 使用模式，优化路由策略

### D12: Web Search API 选型

**决策**: 采用分层选型策略

| 优先级 | 方案 | 适用场景 | 环境变量 |
|--------|------|---------|---------|
| 1 | OpenAI 原生 web_search | GPT 模型 + 简单搜索 | 无需额外配置 |
| 2 | Perplexity API | 需要引用来源的搜索 | `PERPLEXITY_API_KEY` |
| 3 | Exa Search | 高质量网页内容抓取 | `EXA_API_KEY` |
| 4 | Tavily | 备选方案 | `TAVILY_API_KEY` |

**实现策略**:
```typescript
async function executeWebSearch(query: string, type: SearchType) {
  // 1. 优先使用模型原生搜索（如果支持）
  if (modelSupportsNativeSearch(currentModel)) {
    return await nativeWebSearch(query);
  }

  // 2. 按配置的 API 优先级尝试
  for (const provider of getConfiguredSearchProviders()) {
    try {
      return await provider.search(query, { type });
    } catch (e) {
      logger.warn(`Search provider ${provider.name} failed`, e);
      continue;
    }
  }

  throw new SearchError('All search providers failed');
}
```

**理由**:
- 模型原生搜索延迟最低、集成最简单
- 多 API 备选提高可用性
- 不同 API 适合不同场景

### D13: Word 文书生成

**决策**: 使用 docx.js + 模板系统生成法律文书

```typescript
import { Document, Paragraph, TextRun } from 'docx';

// 定义文书生成工具
const generateDocument = tool({
  description: '生成法律文书（Word 格式）',
  inputSchema: z.object({
    templateId: z.enum(['contract', 'complaint', 'letter']),
    data: z.record(z.string()),
  }),
  execute: async ({ templateId, data }) => {
    const template = await loadTemplate(templateId);
    const doc = await fillTemplate(template, data);
    const buffer = await Packer.toBuffer(doc);
    const url = await uploadToBlob(buffer, `${templateId}-${Date.now()}.docx`);
    return { success: true, downloadUrl: url };
  },
});
```

**模板库结构**:
```
lib/templates/
├── contract/           # 合同模板
│   ├── rental.docx    # 租赁合同
│   ├── labor.docx     # 劳动合同
│   └── service.docx   # 服务合同
├── complaint/          # 起诉状模板
│   ├── civil.docx     # 民事起诉状
│   └── admin.docx     # 行政起诉状
└── letter/             # 律师函模板
    └── demand.docx    # 催告函
```

**理由**:
- docx.js 纯 JS 实现，无需服务端依赖
- 模板 + 数据分离，确保格式规范
- LLM 负责内容生成，代码保证格式

## Architecture

### 目录结构

```
lib/ai/
├── agents/                    # Agent 定义
│   ├── types.ts              # Agent 接口
│   ├── router.ts             # 路由 Agent
│   ├── legal-research.ts     # 法律研究 Agent
│   ├── case-analysis.ts      # 案例分析 Agent
│   ├── legal-advisor.ts      # 法律顾问 Agent
│   └── document-draft.ts     # 文书起草 Agent
├── intent/                    # 意图识别
│   ├── classifier.ts         # 分类器实现
│   ├── rules.ts              # 规则匹配
│   └── schema.ts             # 意图类型定义
├── router/                    # 路由调度
│   ├── index.ts              # 路由调度器
│   └── registry.ts           # Agent 注册表
├── tools/
│   └── legal/                # 法律工具
│       ├── web-search.ts
│       ├── regulation-search.ts
│       └── case-search.ts
├── prompts/
│   └── legal/                # 法律 prompts
│       ├── router.ts
│       ├── research.ts
│       └── advisor.ts
└── providers.ts              # 扩展模型配置
```

### 数据流

```
POST /api/chat
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. 意图识别 (classifyIntent)             │
│    - Layer 1: 规则匹配                   │
│    - Layer 2: LLM 分类                   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 2. Agent 路由 (routeToAgent)             │
│    - 选择目标 Agent                      │
│    - 准备 Agent 配置                     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ 3. Agent 执行 (streamText)               │
│    - 动态选择模型                        │
│    - 动态配置工具                        │
│    - 流式输出                           │
└─────────────────────────────────────────┘
```

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 多 Agent 延迟 | 用户体验 | 流式展示中间状态，Layer 1 规则匹配加速 |
| Token 成本增加 | 运营成本 | 意图识别用轻量模型，添加结果缓存 |
| 搜索 API 限流 | 功能可用性 | 实现请求队列和降级策略 |
| 法律准确性 | 用户信任 | 添加免责声明，标注信息来源 |

## Migration Plan

1. **Phase 1**: 添加基础设施（模型配置、类型定义）- 无破坏性变更
2. **Phase 2**: 实现意图识别和 Agent 框架 - 隔离在新目录
3. **Phase 3**: 实现法律工具（webSearch 等）- 独立模块
4. **Phase 4**: 集成到 chat route - 通过配置开关控制
5. **Phase 5**: 添加 UI 组件 - 渐进增强

**回滚策略**: 通过环境变量 `ENABLE_MULTI_AGENT=false` 可随时回退到单 Agent 模式

## Open Questions

1. **搜索 API 选择**: SerpAPI vs Bing Search vs Google Custom Search？
2. **法律数据源**: 是否需要接入北大法宝/裁判文书网等专业数据源？
3. **缓存策略**: 法规检索结果缓存多久合适？
4. **付费模式**: 多 Agent 模式是否作为高级功能收费？
