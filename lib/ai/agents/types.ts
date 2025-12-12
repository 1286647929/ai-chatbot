import type { CoreMessage, LanguageModel, Tool } from "ai";

/**
 * Agent 类型枚举
 */
export const AgentType = {
  ROUTER: "router",
  LEGAL_RESEARCH: "legal-research",
  CASE_ANALYSIS: "case-analysis",
  LEGAL_ADVISOR: "legal-advisor",
  DOCUMENT_DRAFT: "document-draft",
} as const;

export type AgentType = (typeof AgentType)[keyof typeof AgentType];

/**
 * Agent 执行状态
 */
export const AgentStatus = {
  IDLE: "idle",
  RUNNING: "running",
  COMPLETED: "completed",
  ERROR: "error",
  TIMEOUT: "timeout",
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

/**
 * Agent 上下文 - 在 Agent 之间传递的信息
 */
export interface AgentContext {
  /** 会话 ID */
  chatId: string;
  /** 用户 ID */
  userId: string;
  /** 原始用户消息 */
  userMessage: string;
  /** 识别的意图 */
  intent?: string;
  /** 意图置信度 */
  intentConfidence?: number;
  /** 历史消息 */
  messages: CoreMessage[];
  /** 前置 Agent 的输出结果 */
  previousResults?: AgentResult[];
  /** 附件信息 */
  attachments?: Array<{
    name: string;
    contentType: string;
    url: string;
  }>;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * Agent 输入
 */
export interface AgentInput {
  /** Agent 上下文 */
  context: AgentContext;
  /** 可选的额外 prompt */
  additionalPrompt?: string;
}

/**
 * 工具调用记录
 */
export interface ToolCallRecord {
  /** 工具名称 */
  tool: string;
  /** 工具输入 */
  input: unknown;
  /** 工具输出 */
  output: unknown;
  /** 执行时长（毫秒） */
  duration: number;
}

/**
 * Agent 执行结果
 */
export interface AgentResult {
  /** Agent 名称 */
  agentName: AgentType;
  /** 生成的文本内容 */
  content: string;
  /** 执行状态 */
  status: AgentStatus;
  /** 工具调用记录 */
  toolCalls?: ToolCallRecord[];
  /** Token 使用量 */
  tokens?: {
    input: number;
    output: number;
  };
  /** 执行时长（毫秒） */
  duration?: number;
  /** 错误信息（如有） */
  error?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** Agent 类型 */
  type: AgentType;
  /** Agent 名称（显示用） */
  name: string;
  /** Agent 描述 */
  description: string;
  /** 使用的模型 ID */
  modelId: string;
  /** System prompt */
  systemPrompt: string;
  /** 可用的工具集 */
  tools?: Record<string, Tool>;
  /** 最大执行时长（毫秒） */
  maxDuration?: number;
  /** 最大 Token 数 */
  maxTokens?: number;
}

/**
 * Agent 接口 - 定义 Agent 的基本行为
 */
export interface LegalAgent {
  /** Agent 配置 */
  config: AgentConfig;

  /**
   * 非流式执行 - 返回完整结果
   */
  generate(input: AgentInput): Promise<AgentResult>;

  /**
   * 流式执行 - 返回流结果和最终结果 Promise
   * streamResult 可以调用 toUIMessageStream() 转换为标准 AI SDK 格式
   */
  stream(input: AgentInput): Promise<{
    streamResult: {
      consumeStream(): void;
      toUIMessageStream(options?: { sendReasoning?: boolean }): ReadableStream;
    };
    result: Promise<AgentResult>;
  }>;
}

/**
 * Agent 工厂函数类型
 */
export type AgentFactory = (model: LanguageModel) => LegalAgent;

/**
 * Agent 追踪数据 - 用于可观察性
 */
export interface AgentTrace {
  /** 全局追踪 ID */
  traceId: string;
  /** 会话 ID */
  chatId: string;
  /** 时间戳 */
  timestamp: Date;
  /** 意图识别信息 */
  intent: {
    classified: string;
    confidence: number;
    layer: "rule" | "llm";
  };
  /** 路由信息 */
  routing: {
    selectedAgents: AgentType[];
    reason: string;
  };
  /** Agent 执行详情 */
  execution: Array<{
    agentName: AgentType;
    startTime: Date;
    endTime: Date;
    toolCalls: ToolCallRecord[];
    tokens: { input: number; output: number };
    status: AgentStatus;
    error?: string;
  }>;
  /** 总执行时长 */
  totalDuration: number;
  /** 总 Token 使用 */
  totalTokens: { input: number; output: number };
}

/**
 * 错误消息模板
 */
export const ERROR_MESSAGES = {
  timeout: "部分法律信息检索超时，以下回答基于已获取的信息。",
  tool_failure: "法规数据库暂时无法访问，建议稍后重试。",
  agent_failure: "专业分析暂时不可用，以下是通用建议。",
} as const;
