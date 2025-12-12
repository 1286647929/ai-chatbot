# AI SDK Agent 和 MCP 用法指南

## 概述

AI SDK 5.x 主要通过 `generateText` 和 `streamText` 函数配合 `tools` 和 `maxSteps` 实现 Agent 功能，而不是使用独立的 Agent 类。

## 核心 API

### 1. streamText（推荐用于聊天场景）

```typescript
import { streamText, tool } from 'ai';

const result = streamText({
  model: myProvider.languageModel('chat-model'),
  system: systemPrompt,
  messages: convertToModelMessages(uiMessages),
  tools: {
    webSearch: tool({
      description: '搜索网络获取信息',
      inputSchema: z.object({
        query: z.string(),
      }),
      execute: async ({ query }) => {
        // 执行搜索
        return { results: [] };
      },
    }),
  },
  stopWhen: stepCountIs(5), // 最大步数控制
  onStepFinish: (step) => {
    // 每步完成回调
  },
  onFinish: async ({ usage }) => {
    // 全部完成回调
  },
});
```

### 2. generateText（用于后台任务）

```typescript
import { generateText } from 'ai';

const result = await generateText({
  model: myProvider.languageModel('intent-model'),
  system: classifierPrompt,
  messages: [{ role: 'user', content: userMessage }],
  tools: { /* ... */ },
  maxOutputTokens: 1000,
});
```

### 3. tool 定义

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const myTool = tool({
  description: '工具描述',
  inputSchema: z.object({
    param1: z.string().describe('参数描述'),
    param2: z.number().optional(),
  }),
  execute: async (params) => {
    // 执行逻辑
    return { success: true, data: result };
  },
});
```

## MCP 集成

### 安装

```bash
pnpm add @ai-sdk/mcp @modelcontextprotocol/sdk
```

### 使用 experimental_createMCPClient

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// HTTP 传输（推荐生产环境）
const client = await createMCPClient({
  transport: new StreamableHTTPClientTransport(
    new URL('http://localhost:3000/mcp'),
    {
      requestInit: {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      },
    }
  ),
  name: 'legal-mcp-client',
});

// 获取工具
const tools = await client.getTools();

// SSE 传输
const sseClient = await createMCPClient({
  name: 'sse-client',
  transport: {
    type: 'sse',
    url: 'http://localhost:8080/sse',
  },
});

// Stdio 传输（仅本地开发）
import { Experimental_StdioMCPTransport as StdioTransport } from 'ai/mcp-stdio';

const stdioClient = await createMCPClient({
  name: 'stdio-client',
  transport: new StdioTransport({
    command: 'npx',
    args: ['-y', 'legal-mcp-server@latest'],
  }),
});
```

### 在 streamText 中使用 MCP 工具

```typescript
const mcpTools = await client.getTools();

const result = streamText({
  model: myProvider.languageModel('chat-model'),
  tools: {
    ...localTools,
    ...mcpTools, // 合并 MCP 工具
  },
  // ...
});
```

## 多 Agent 编排模式

当前项目使用自定义的 BaseAgent 类和 Orchestrator：

1. **BaseAgent**: 封装 `generateText` 和 `streamText`，提供统一的 Agent 接口
2. **Orchestrator**: 管理多 Agent 的执行顺序（串行/并行）和结果汇总
3. **Router**: 基于意图识别路由到合适的 Agent

## 关键注意事项

1. `experimental_createMCPClient` 是实验性 API，可能变更
2. HTTP 传输推荐用于生产，stdio 仅限本地开发
3. MCP 工具通过 `getTools()` 获取后可直接传入 `streamText` 的 tools 参数
4. `maxSteps` 或 `stopWhen: stepCountIs(n)` 控制 Agent 循环次数
