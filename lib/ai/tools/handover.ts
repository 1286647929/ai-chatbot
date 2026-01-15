/**
 * Handover 工具
 * 允许 Agent 在需要其他专业能力时，主动将任务传递给其他 Agent
 */

import { tool } from "ai";
import { z } from "zod";
import { AgentType } from "../agents/types";

/**
 * Handover 请求类型
 */
export type HandoverRequest = {
  /** 目标 Agent */
  targetAgent: AgentType;
  /** 传递的任务描述 */
  taskDescription: string;
  /** 携带的上下文信息 */
  context: string;
  /** 原因说明 */
  reason: string;
};

/**
 * Handover 结果类型
 */
export type HandoverResult = {
  /** 是否成功 */
  success: boolean;
  /** 目标 Agent */
  targetAgent: AgentType;
  /** 消息 */
  message: string;
  /** 请求 ID（用于追踪） */
  requestId: string;
};

/**
 * Agent 类型映射（用于验证和显示）
 */
const AGENT_INFO = {
  [AgentType.LEGAL_RESEARCH]: {
    name: "法律研究专家",
    capabilities: ["法律法规检索", "条文解读", "法律依据分析"],
    description: "负责法律法规检索、条文解读和法律依据分析",
  },
  [AgentType.CASE_ANALYSIS]: {
    name: "案例分析专家",
    capabilities: ["案例检索", "判例分析", "裁判结果预测"],
    description: "负责法律案例检索、判例分析和裁判结果预测",
  },
  [AgentType.LEGAL_ADVISOR]: {
    name: "法律顾问",
    capabilities: ["综合法律咨询", "风险评估", "解决方案制定"],
    description: "提供综合性法律咨询，整合研究和案例分析结果",
  },
  [AgentType.DOCUMENT_DRAFT]: {
    name: "文书起草专家",
    capabilities: ["合同起草", "诉讼文书", "法律函件"],
    description: "负责各类法律文书的起草",
  },
  [AgentType.ROUTER]: {
    name: "路由调度",
    capabilities: ["意图识别", "任务分配"],
    description: "负责识别用户意图并分配任务",
  },
} as const;

/**
 * 生成唯一请求 ID
 */
function generateRequestId(): string {
  return `handover_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Handover 工具定义
 * 当当前 Agent 发现问题需要其他专业 Agent 处理时使用
 */
export const handover = tool({
  description: `将任务传递给其他专业 Agent。当你发现当前问题需要其他专业能力时使用此工具。

可用的目标 Agent：
- legal-research: 法律研究专家 - 法律法规检索、条文解读
- case-analysis: 案例分析专家 - 案例检索、判例分析
- legal-advisor: 法律顾问 - 综合咨询、风险评估
- document-draft: 文书起草专家 - 合同、诉讼文书起草

使用场景：
1. 发现问题涉及其他专业领域
2. 需要先获取其他专业分析结果
3. 用户明确要求其他类型的服务`,

  inputSchema: z.object({
    targetAgent: z
      .enum([
        AgentType.LEGAL_RESEARCH,
        AgentType.CASE_ANALYSIS,
        AgentType.LEGAL_ADVISOR,
        AgentType.DOCUMENT_DRAFT,
      ])
      .describe("目标 Agent 类型"),
    taskDescription: z
      .string()
      .min(10)
      .describe("需要目标 Agent 处理的具体任务描述"),
    context: z
      .string()
      .describe("传递给目标 Agent 的上下文信息，包括已分析的内容"),
    reason: z.string().describe("为什么需要传递给这个 Agent 的原因说明"),
  }),

  execute: async (input): Promise<HandoverResult> => {
    const { targetAgent, taskDescription, context, reason } = input;

    // 验证目标 Agent 是否存在
    const agentInfo = AGENT_INFO[targetAgent];
    if (!agentInfo) {
      return {
        success: false,
        targetAgent,
        message: `未知的目标 Agent: ${targetAgent}`,
        requestId: generateRequestId(),
      };
    }

    // 生成请求 ID 用于追踪
    const requestId = generateRequestId();

    // 记录 handover 请求（用于日志和追踪）
    console.log("[Handover]", {
      requestId,
      targetAgent,
      agentName: agentInfo.name,
      taskDescription: taskDescription.substring(0, 100) + "...",
      reason,
      timestamp: new Date().toISOString(),
    });

    // 返回 handover 结果
    // 注意：实际的 Agent 切换由 Orchestrator 根据这个结果来执行
    return {
      success: true,
      targetAgent,
      message: `任务已准备传递给${agentInfo.name}。${agentInfo.description}。`,
      requestId,
    };
  },
});

/**
 * 创建带有上下文的 handover 工具
 * 用于在特定 Agent 中注入额外的上下文信息
 */
export function createHandoverTool(currentAgent: AgentType) {
  return tool({
    description: `将任务传递给其他专业 Agent（当前 Agent: ${currentAgent}）。
当你发现当前问题需要其他专业能力时使用此工具。

可传递的目标：
${Object.entries(AGENT_INFO)
  .filter(([type]) => type !== currentAgent && type !== AgentType.ROUTER)
  .map(([type, info]) => `- ${type}: ${info.name} - ${info.description}`)
  .join("\n")}`,

    inputSchema: z.object({
      targetAgent: z
        .enum([
          AgentType.LEGAL_RESEARCH,
          AgentType.CASE_ANALYSIS,
          AgentType.LEGAL_ADVISOR,
          AgentType.DOCUMENT_DRAFT,
        ])
        .describe("目标 Agent 类型"),
      taskDescription: z
        .string()
        .min(10)
        .describe("需要目标 Agent 处理的具体任务描述"),
      context: z
        .string()
        .describe("传递给目标 Agent 的上下文信息"),
      reason: z.string().describe("传递原因说明"),
    }),

    execute: async (input): Promise<HandoverResult> => {
      const { targetAgent, taskDescription, context, reason } = input;

      // 不允许传递给自己
      if (targetAgent === currentAgent) {
        return {
          success: false,
          targetAgent,
          message: "不能将任务传递给自己",
          requestId: generateRequestId(),
        };
      }

      const agentInfo = AGENT_INFO[targetAgent];
      const requestId = generateRequestId();

      console.log("[Handover]", {
        requestId,
        fromAgent: currentAgent,
        targetAgent,
        taskDescription: taskDescription.substring(0, 100),
        reason,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        targetAgent,
        message: `任务将传递给${agentInfo.name}。上下文信息已准备就绪。`,
        requestId,
      };
    },
  });
}

/**
 * 获取 Agent 信息
 */
export function getAgentInfo(agentType: AgentType) {
  return AGENT_INFO[agentType];
}

/**
 * 获取可用的目标 Agent 列表（排除指定 Agent）
 */
export function getAvailableTargets(excludeAgent?: AgentType): AgentType[] {
  const all = [
    AgentType.LEGAL_RESEARCH,
    AgentType.CASE_ANALYSIS,
    AgentType.LEGAL_ADVISOR,
    AgentType.DOCUMENT_DRAFT,
  ];

  if (excludeAgent) {
    return all.filter((a) => a !== excludeAgent);
  }

  return all;
}
