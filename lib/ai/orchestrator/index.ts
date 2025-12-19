import type { Tool } from "ai";
import { smoothStream, streamText, type UIMessageStreamWriter } from "ai";
import {
  createAgent,
  createCaseAnalysisAgent,
  createDocumentDraftAgent,
  createLegalAdvisorAgent,
  createLegalResearchAgent,
} from "../agents";
import {
  type AgentContext,
  type AgentResult,
  AgentStatus,
  AgentType,
  ERROR_MESSAGES,
} from "../agents/types";
import { getChatModel } from "../model-config";
import { regularPrompt } from "../prompts";
import { type RoutingDecision, routeToAgent } from "../router";
import {
  caseAnalysisTools,
  documentDraftTools,
  legalAdvisorTools,
  legalResearchTools,
  webSearch,
} from "../tools/legal";
import { getAllMcpTools } from "../tools/mcp";
import { createTraceRecorder, traceStore } from "../tracing";

// MCP 工具缓存（请求级别）
let mcpToolsCache: Record<string, Tool> | null = null;
let mcpToolsCacheTime = 0;
const MCP_TOOLS_CACHE_TTL = 60000; // 1 分钟缓存

/**
 * 检查是否启用 MCP 工具
 */
function isMcpEnabled(): boolean {
  return process.env.ENABLE_MCP_TOOLS === "true";
}

/**
 * 获取 MCP 工具（带缓存）
 */
async function getCachedMcpTools(): Promise<Record<string, Tool>> {
  if (!isMcpEnabled()) {
    return {};
  }

  const now = Date.now();
  if (mcpToolsCache && now - mcpToolsCacheTime < MCP_TOOLS_CACHE_TTL) {
    return mcpToolsCache;
  }

  try {
    mcpToolsCache = await getAllMcpTools();
    mcpToolsCacheTime = now;
    console.log(`[Orchestrator] MCP 工具已加载: ${Object.keys(mcpToolsCache).length} 个`);
    return mcpToolsCache;
  } catch (error) {
    console.error("[Orchestrator] MCP 工具加载失败:", error);
    return {};
  }
}

/**
 * 编排器配置
 */
export interface OrchestratorConfig {
  /** 单个 Agent 超时时间（毫秒） */
  agentTimeout: number;
  /** 是否启用并行执行 */
  enableParallel: boolean;
  /** 最大重试次数 */
  maxRetries: number;
}

/**
 * 从环境变量获取 Agent 超时配置
 * 默认 60 秒，可通过 AGENT_DEFAULT_TIMEOUT 环境变量配置（单位：毫秒）
 */
function getAgentTimeout(): number {
  const envTimeout = process.env.AGENT_DEFAULT_TIMEOUT;
  if (envTimeout) {
    const parsed = Number.parseInt(envTimeout, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 60_000; // 默认 60 秒
}

const defaultConfig: OrchestratorConfig = {
  agentTimeout: getAgentTimeout(),
  enableParallel: true,
  maxRetries: 1,
};

/**
 * 编排器执行结果
 */
export interface OrchestratorResult {
  /** 最终文本输出 */
  text: string;
  /** 各 Agent 执行结果 */
  agentResults: AgentResult[];
  /** 路由决策 */
  routing: RoutingDecision;
  /** 总执行时长 */
  totalDuration: number;
  /** 是否部分失败 */
  partialFailure: boolean;
}

/**
 * 工具选项
 */
interface ToolOptions {
  /** 是否启用 Web 搜索 */
  webSearchEnabled?: boolean;
}

/**
 * 根据 Agent 类型获取对应的基础工具集
 */
function getBaseToolsForAgent(agentType: AgentType): Record<string, Tool> | undefined {
  switch (agentType) {
    case AgentType.LEGAL_RESEARCH:
      return legalResearchTools;
    case AgentType.CASE_ANALYSIS:
      return caseAnalysisTools;
    case AgentType.LEGAL_ADVISOR:
      return legalAdvisorTools;
    case AgentType.DOCUMENT_DRAFT:
      return documentDraftTools;
    default:
      return undefined;
  }
}

/**
 * 根据 Agent 类型获取对应的工具集（支持 MCP 和 webSearchEnabled）
 */
async function getToolsForAgent(
  agentType: AgentType,
  options: ToolOptions = {}
): Promise<Record<string, Tool> | undefined> {
  const { webSearchEnabled = true } = options;

  // 获取基础工具集
  const baseTools = getBaseToolsForAgent(agentType);
  if (!baseTools) {
    return undefined;
  }

  // 复制工具集以避免修改原始对象
  let tools: Record<string, Tool> = { ...baseTools };

  // 根据 webSearchEnabled 条件性移除或保留 webSearch
  if (!webSearchEnabled && "webSearch" in tools) {
    const { webSearch: _, ...rest } = tools;
    tools = rest;
  }

  // 获取 MCP 工具并合并
  const mcpTools = await getCachedMcpTools();
  if (Object.keys(mcpTools).length > 0) {
    tools = { ...tools, ...mcpTools };
  }

  return tools;
}

/**
 * 根据 Agent 类型创建 Agent 实例
 */
async function createAgentInstance(agentType: AgentType, options: ToolOptions = {}) {
  const tools = await getToolsForAgent(agentType, options);

  switch (agentType) {
    case AgentType.LEGAL_RESEARCH:
      return createLegalResearchAgent(tools);
    case AgentType.CASE_ANALYSIS:
      return createCaseAnalysisAgent(tools);
    case AgentType.LEGAL_ADVISOR:
      return createLegalAdvisorAgent(tools);
    case AgentType.DOCUMENT_DRAFT:
      return createDocumentDraftAgent(tools);
    default:
      return createAgent(agentType, tools);
  }
}

/**
 * 执行单个 Agent（带超时和重试）
 */
async function executeAgent(
  agentType: AgentType,
  context: AgentContext,
  config: OrchestratorConfig
): Promise<AgentResult> {
  // 从 context.metadata 中获取 webSearchEnabled
  const webSearchEnabled = context.metadata?.webSearchEnabled !== false;
  const agent = await createAgentInstance(agentType, { webSearchEnabled });
  let lastError: string | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        agent.generate({ context }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Agent execution timeout")),
            config.agentTimeout
          )
        ),
      ]);

      if (result.status === AgentStatus.COMPLETED) {
        return result;
      }

      lastError = result.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(
        `[Orchestrator] Agent ${agentType} attempt ${attempt + 1} failed:`,
        lastError
      );
    }
  }

  // 所有重试失败
  return {
    agentName: agentType,
    content: "",
    status: AgentStatus.ERROR,
    error: lastError,
  };
}

/**
 * 流式执行单个 Agent
 * 使用标准 AI SDK 消息流格式，确保前端能正确渲染
 */
async function streamAgent(
  agentType: AgentType,
  context: AgentContext,
  dataStream: UIMessageStreamWriter,
  config: OrchestratorConfig
): Promise<AgentResult> {
  const agentStartTime = Date.now();
  console.log(`[StreamAgent] 开始执行 ${agentType}`, { timestamp: new Date().toISOString() });

  // 从 context.metadata 中获取 webSearchEnabled
  const webSearchEnabled = context.metadata?.webSearchEnabled !== false;
  const agent = await createAgentInstance(agentType, { webSearchEnabled });

  try {
    // 通知前端当前 Agent 开始执行
    dataStream.write({
      type: "data-agent-status",
      data: { agent: agentType, status: "running" },
    });

    console.log(`[StreamAgent] ${agentType} 开始调用 agent.stream()...`);
    const streamCallTime = Date.now();
    const { streamResult, result } = await agent.stream({ context });
    console.log(`[StreamAgent] ${agentType} agent.stream() 返回`, {
      耗时: `${Date.now() - streamCallTime}ms`,
    });

    // 消费流并合并到 dataStream（使用标准 AI SDK 格式）
    console.log(`[StreamAgent] ${agentType} 开始消费流并合并...`);
    streamResult.consumeStream();
    dataStream.merge(
      streamResult.toUIMessageStream({
        sendReasoning: true,
      })
    );

    // 创建超时 Promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Agent execution timeout")),
        config.agentTimeout
      )
    );

    // 等待结果（带超时）
    console.log(`[StreamAgent] ${agentType} 等待流完成...`);
    const waitStartTime = Date.now();
    const finalResult = await Promise.race([result, timeoutPromise]);
    console.log(`[StreamAgent] ${agentType} 流完成`, {
      等待耗时: `${Date.now() - waitStartTime}ms`,
      总耗时: `${Date.now() - agentStartTime}ms`,
      状态: finalResult.status,
    });

    // 通知前端 Agent 执行完成
    dataStream.write({
      type: "data-agent-status",
      data: { agent: agentType, status: finalResult.status },
    });

    return finalResult;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[StreamAgent] ${agentType} 执行出错`, {
      错误: errorMessage,
      总耗时: `${Date.now() - agentStartTime}ms`,
    });

    dataStream.write({
      type: "data-agent-status",
      data: { agent: agentType, status: "error", error: errorMessage },
    });

    return {
      agentName: agentType,
      content: "",
      status: AgentStatus.ERROR,
      error: errorMessage,
    };
  }
}

/**
 * 并行执行多个 Agent
 */
async function executeParallel(
  agentTypes: AgentType[],
  context: AgentContext,
  config: OrchestratorConfig
): Promise<AgentResult[]> {
  const results = await Promise.allSettled(
    agentTypes.map((agentType) => executeAgent(agentType, context, config))
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      agentName: agentTypes[index],
      content: "",
      status: AgentStatus.ERROR,
      error: result.reason?.message || "Unknown error",
    };
  });
}

/**
 * 串行执行多个 Agent（结果传递）
 */
async function executeSequential(
  agentTypes: AgentType[],
  context: AgentContext,
  config: OrchestratorConfig
): Promise<AgentResult[]> {
  const results: AgentResult[] = [];
  let currentContext = { ...context };

  for (const agentType of agentTypes) {
    const result = await executeAgent(agentType, currentContext, config);
    results.push(result);

    // 将结果添加到上下文中供下一个 Agent 使用
    if (result.status === AgentStatus.COMPLETED) {
      currentContext = {
        ...currentContext,
        previousResults: [...(currentContext.previousResults || []), result],
      };
    }
  }

  return results;
}

/**
 * 汇总多个 Agent 的结果
 */
function summarizeResults(results: AgentResult[]): string {
  const successfulResults = results.filter(
    (r) => r.status === AgentStatus.COMPLETED && r.content
  );

  if (successfulResults.length === 0) {
    return ERROR_MESSAGES.agent_failure;
  }

  // 如果只有一个结果，直接返回
  if (successfulResults.length === 1) {
    return successfulResults[0].content;
  }

  // 多个结果需要整合
  // 这里简单拼接，后续可以用 LLM 做更智能的整合
  const parts = successfulResults.map(
    (r) => `### ${getAgentDisplayName(r.agentName)}分析\n\n${r.content}`
  );

  return parts.join("\n\n---\n\n");
}

/**
 * 获取 Agent 显示名称
 */
function getAgentDisplayName(agentType: AgentType): string {
  const names: Record<AgentType, string> = {
    [AgentType.ROUTER]: "路由决策",
    [AgentType.LEGAL_RESEARCH]: "法律研究",
    [AgentType.CASE_ANALYSIS]: "案例分析",
    [AgentType.LEGAL_ADVISOR]: "法律顾问",
    [AgentType.DOCUMENT_DRAFT]: "文书起草",
  };
  return names[agentType] || agentType;
}

/**
 * 多 Agent 编排器 - 非流式版本
 */
export async function orchestrate(
  context: AgentContext,
  config: OrchestratorConfig = defaultConfig
): Promise<OrchestratorResult> {
  const startTime = Date.now();

  // 1. 路由决策
  const routing = await routeToAgent(context);

  // 2. 如果是通用对话，不需要法律 Agent
  if (routing.selectedAgents.length === 0) {
    return {
      text: "",
      agentResults: [],
      routing,
      totalDuration: Date.now() - startTime,
      partialFailure: false,
    };
  }

  // 3. 执行 Agent
  let agentResults: AgentResult[];

  if (routing.requiresCollaboration && !config.enableParallel) {
    // 串行执行（结果传递模式）
    agentResults = await executeSequential(
      routing.selectedAgents,
      context,
      config
    );
  } else if (routing.requiresCollaboration && config.enableParallel) {
    // 并行执行前置 Agent，然后串行执行最终 Agent
    const preAgents = routing.selectedAgents.slice(0, -1);
    const finalAgent =
      routing.selectedAgents[routing.selectedAgents.length - 1];

    // 并行执行前置 Agent
    const preResults = await executeParallel(preAgents, context, config);

    // 将前置结果传递给最终 Agent
    const finalContext: AgentContext = {
      ...context,
      previousResults: preResults.filter(
        (r) => r.status === AgentStatus.COMPLETED
      ),
    };

    const finalResult = await executeAgent(finalAgent, finalContext, config);
    agentResults = [...preResults, finalResult];
  } else {
    // 单个 Agent 执行
    agentResults = await executeSequential(
      routing.selectedAgents,
      context,
      config
    );
  }

  // 4. 汇总结果
  const text = summarizeResults(agentResults);
  const partialFailure = agentResults.some(
    (r) => r.status !== AgentStatus.COMPLETED
  );

  return {
    text,
    agentResults,
    routing,
    totalDuration: Date.now() - startTime,
    partialFailure,
  };
}

/**
 * 多 Agent 编排器 - 流式版本
 */
export async function orchestrateStream(
  context: AgentContext,
  dataStream: UIMessageStreamWriter,
  config: OrchestratorConfig = defaultConfig
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  console.log("[Orchestrator] 开始处理请求", { timestamp: new Date().toISOString() });

  // 创建追踪记录器
  const traceRecorder = createTraceRecorder(context.chatId);

  // 1. 路由决策
  console.log("[Orchestrator] 开始意图识别...");
  const routingStartTime = Date.now();
  const routing = await routeToAgent(context);
  console.log("[Orchestrator] 意图识别完成", {
    耗时: `${Date.now() - routingStartTime}ms`,
    意图: routing.intent.intent,
    置信度: routing.intent.confidence,
    选中Agent: routing.selectedAgents,
  });

  // 记录意图和路由决策
  traceRecorder.recordIntent(routing.intent);
  traceRecorder.recordRouting(routing.selectedAgents, routing.reason);

  // 通知前端路由结果
  dataStream.write({
    type: "data-routing",
    data: {
      intent: routing.intent.intent,
      confidence: routing.intent.confidence,
      selectedAgents: routing.selectedAgents,
      reason: routing.reason,
      traceId: traceRecorder.getTraceId(),
    },
  });

  // 2. 如果是通用对话，使用默认聊天模型
  if (routing.selectedAgents.length === 0) {
    console.log("[Orchestrator] 通用对话模式，开始调用 streamText...");
    const streamStartTime = Date.now();
    let firstChunkLogged = false;

    // 调用默认聊天模型进行流式响应
    const result = streamText({
      model: getChatModel("default"),
      system: regularPrompt,
      messages: context.messages,
      experimental_transform: smoothStream({ chunking: "word" }),
      onChunk: ({ chunk }) => {
        // 只在第一个 text-delta chunk 时打印日志
        if (chunk.type === "text-delta" && !firstChunkLogged) {
          firstChunkLogged = true;
          const now = Date.now();
          console.log("[Orchestrator] 收到第一个 text-delta", {
            距离streamText调用: `${now - streamStartTime}ms`,
            总耗时: `${now - startTime}ms`,
          });
        }
      },
    });

    console.log("[Orchestrator] streamText 已调用，开始消费流...");

    // 消费流并合并到 dataStream
    result.consumeStream();

    dataStream.merge(
      result.toUIMessageStream({
        sendReasoning: true,
      })
    );

    console.log("[Orchestrator] 流已合并到 dataStream，等待完成...");

    // 等待流完成并获取最终文本
    const finalText = await result.text;

    console.log("[Orchestrator] 流式响应完成", {
      总耗时: `${Date.now() - startTime}ms`,
      响应长度: finalText.length,
    });

    // 保存追踪（通用对话模式）
    const trace = traceRecorder.finalize();
    traceStore.save(trace);

    return {
      text: finalText,
      agentResults: [],
      routing,
      totalDuration: Date.now() - startTime,
      partialFailure: false,
    };
  }

  // 3. 流式执行 Agent（串行模式，便于流式输出）
  console.log("[Orchestrator] 法律Agent模式，开始执行Agent:", routing.selectedAgents);
  const agentResults: AgentResult[] = [];
  let currentContext = { ...context };

  for (const agentType of routing.selectedAgents) {
    console.log(`[Orchestrator] 开始执行 Agent: ${agentType}`);
    const agentStartTime = Date.now();

    // 记录 Agent 开始执行
    traceRecorder.startAgentExecution(agentType);

    const result = await streamAgent(
      agentType,
      currentContext,
      dataStream,
      config
    );

    console.log(`[Orchestrator] Agent ${agentType} 执行完成`, {
      耗时: `${Date.now() - agentStartTime}ms`,
      状态: result.status,
    });

    // 记录 Agent 执行结果
    traceRecorder.endAgentExecution(result);

    agentResults.push(result);

    if (result.status === AgentStatus.COMPLETED) {
      currentContext = {
        ...currentContext,
        previousResults: [...(currentContext.previousResults || []), result],
      };
    }
  }

  // 4. 保存追踪记录
  const trace = traceRecorder.finalize();
  traceStore.save(trace);

  // 5. 返回结果
  const text = summarizeResults(agentResults);
  const partialFailure = agentResults.some(
    (r) => r.status !== AgentStatus.COMPLETED
  );

  console.log("[Orchestrator] 所有Agent执行完成", {
    总耗时: `${Date.now() - startTime}ms`,
    Agent数量: agentResults.length,
    部分失败: partialFailure,
    traceId: trace.traceId,
  });

  return {
    text,
    agentResults,
    routing,
    totalDuration: Date.now() - startTime,
    partialFailure,
  };
}
