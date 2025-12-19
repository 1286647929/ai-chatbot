/**
 * Agent 追踪系统
 * 用于记录和分析 Agent 执行过程
 */

import type {
  AgentResult,
  AgentStatus,
  AgentTrace,
  AgentType,
  ToolCallRecord,
} from "../agents/types";
import type { Intent } from "../intent";

/**
 * 生成追踪 ID
 */
export function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `trace_${timestamp}_${random}`;
}

/**
 * 追踪记录器
 */
export class TraceRecorder {
  private traceId: string;
  private chatId: string;
  private startTime: Date;
  private intent: AgentTrace["intent"] | null = null;
  private routing: AgentTrace["routing"] | null = null;
  private executions: AgentTrace["execution"] = [];
  private currentExecution: {
    agentName: AgentType;
    startTime: Date;
    toolCalls: ToolCallRecord[];
  } | null = null;

  constructor(chatId: string) {
    this.traceId = generateTraceId();
    this.chatId = chatId;
    this.startTime = new Date();
  }

  /**
   * 获取追踪 ID
   */
  getTraceId(): string {
    return this.traceId;
  }

  /**
   * 记录意图分类结果
   */
  recordIntent(intent: Intent): void {
    this.intent = {
      classified: intent.intent,
      confidence: intent.confidence,
      layer: intent.layer,
    };
  }

  /**
   * 记录路由决策
   */
  recordRouting(selectedAgents: AgentType[], reason: string): void {
    this.routing = {
      selectedAgents,
      reason,
    };
  }

  /**
   * 开始 Agent 执行
   */
  startAgentExecution(agentName: AgentType): void {
    this.currentExecution = {
      agentName,
      startTime: new Date(),
      toolCalls: [],
    };
  }

  /**
   * 记录工具调用
   */
  recordToolCall(toolCall: ToolCallRecord): void {
    if (this.currentExecution) {
      this.currentExecution.toolCalls.push(toolCall);
    }
  }

  /**
   * 结束 Agent 执行
   */
  endAgentExecution(result: AgentResult): void {
    if (!this.currentExecution) return;

    const execution = {
      agentName: this.currentExecution.agentName,
      startTime: this.currentExecution.startTime,
      endTime: new Date(),
      toolCalls: this.currentExecution.toolCalls,
      tokens: result.tokens || { input: 0, output: 0 },
      status: result.status as AgentStatus,
      error: result.error,
    };

    this.executions.push(execution);
    this.currentExecution = null;
  }

  /**
   * 完成追踪并生成结果
   */
  finalize(): AgentTrace {
    const endTime = new Date();
    const totalDuration = endTime.getTime() - this.startTime.getTime();

    // 计算总 token 使用
    const totalTokens = this.executions.reduce(
      (acc, exec) => ({
        input: acc.input + exec.tokens.input,
        output: acc.output + exec.tokens.output,
      }),
      { input: 0, output: 0 }
    );

    return {
      traceId: this.traceId,
      chatId: this.chatId,
      timestamp: this.startTime,
      intent: this.intent || {
        classified: "unknown",
        confidence: 0,
        layer: "rule",
      },
      routing: this.routing || {
        selectedAgents: [],
        reason: "Unknown",
      },
      execution: this.executions,
      totalDuration,
      totalTokens,
    };
  }
}

/**
 * 追踪存储（内存版本）
 * 生产环境应替换为数据库存储
 */
class TraceStore {
  private traces: Map<string, AgentTrace> = new Map();
  private maxSize = 1000; // 最大存储数量

  /**
   * 保存追踪
   */
  save(trace: AgentTrace): void {
    // 如果超过最大数量，删除最旧的记录
    if (this.traces.size >= this.maxSize) {
      const oldestKey = this.traces.keys().next().value;
      if (oldestKey) {
        this.traces.delete(oldestKey);
      }
    }

    this.traces.set(trace.traceId, trace);
    console.log("[TraceStore] Saved trace:", {
      traceId: trace.traceId,
      chatId: trace.chatId,
      duration: `${trace.totalDuration}ms`,
      agents: trace.execution.map((e) => e.agentName).join(" → "),
    });
  }

  /**
   * 获取追踪
   */
  get(traceId: string): AgentTrace | undefined {
    return this.traces.get(traceId);
  }

  /**
   * 按 chatId 查询
   */
  getByChatId(chatId: string): AgentTrace[] {
    return Array.from(this.traces.values())
      .filter((t) => t.chatId === chatId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 按时间范围查询
   */
  getByTimeRange(start: Date, end: Date): AgentTrace[] {
    return Array.from(this.traces.values())
      .filter((t) => t.timestamp >= start && t.timestamp <= end)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 按 Agent 类型过滤
   */
  getByAgentType(agentType: AgentType): AgentTrace[] {
    return Array.from(this.traces.values())
      .filter((t) => t.execution.some((e) => e.agentName === agentType))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalTraces: number;
    avgDuration: number;
    avgTokens: { input: number; output: number };
    agentUsage: Record<string, number>;
    intentDistribution: Record<string, number>;
  } {
    const traces = Array.from(this.traces.values());

    if (traces.length === 0) {
      return {
        totalTraces: 0,
        avgDuration: 0,
        avgTokens: { input: 0, output: 0 },
        agentUsage: {},
        intentDistribution: {},
      };
    }

    const totalDuration = traces.reduce((sum, t) => sum + t.totalDuration, 0);
    const totalInputTokens = traces.reduce(
      (sum, t) => sum + t.totalTokens.input,
      0
    );
    const totalOutputTokens = traces.reduce(
      (sum, t) => sum + t.totalTokens.output,
      0
    );

    // Agent 使用分布
    const agentUsage: Record<string, number> = {};
    for (const trace of traces) {
      for (const exec of trace.execution) {
        agentUsage[exec.agentName] = (agentUsage[exec.agentName] || 0) + 1;
      }
    }

    // 意图分布
    const intentDistribution: Record<string, number> = {};
    for (const trace of traces) {
      const intent = trace.intent.classified;
      intentDistribution[intent] = (intentDistribution[intent] || 0) + 1;
    }

    return {
      totalTraces: traces.length,
      avgDuration: totalDuration / traces.length,
      avgTokens: {
        input: totalInputTokens / traces.length,
        output: totalOutputTokens / traces.length,
      },
      agentUsage,
      intentDistribution,
    };
  }

  /**
   * 清空存储
   */
  clear(): void {
    this.traces.clear();
  }

  /**
   * 获取所有追踪（分页）
   */
  getAll(page = 1, pageSize = 20): {
    data: AgentTrace[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const all = Array.from(this.traces.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      data: all.slice(start, end),
      total: all.length,
      page,
      pageSize,
    };
  }
}

// 全局追踪存储实例
export const traceStore = new TraceStore();

/**
 * 创建追踪记录器的便捷函数
 */
export function createTraceRecorder(chatId: string): TraceRecorder {
  return new TraceRecorder(chatId);
}
