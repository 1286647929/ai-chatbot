import {
  type AgentConfig,
  type AgentContext,
  AgentType,
} from "../agents/types";
import { classifyIntent, type Intent, LegalIntentType } from "../intent";
import { agentRegistry, getAgentTypeForIntent } from "./registry";

/**
 * 路由决策结果
 */
export interface RoutingDecision {
  /** 选中的 Agent 类型列表 */
  selectedAgents: AgentType[];
  /** 是否需要多 Agent 协作 */
  requiresCollaboration: boolean;
  /** 意图分类结果 */
  intent: Intent;
  /** 路由原因 */
  reason: string;
  /** Agent 配置列表 */
  agentConfigs: AgentConfig[];
}

/**
 * 路由调度器配置
 */
export interface RouterConfig {
  /** 是否启用多 Agent 模式 */
  enableMultiAgent: boolean;
  /** 是否启用 LLM 路由决策 */
  enableLLMRouting: boolean;
  /** 复杂问题阈值（触发多 Agent 协作） */
  complexityThreshold: number;
}

const defaultRouterConfig: RouterConfig = {
  enableMultiAgent: true,
  enableLLMRouting: true,
  complexityThreshold: 0.7,
};

/**
 * 判断是否为复杂问题（需要多 Agent 协作）
 */
function isComplexQuery(message: string, intent: Intent): boolean {
  // 1. 消息长度较长可能表示复杂问题
  if (message.length > 200) return true;

  // 2. 包含多种法律问题指标
  const legalIndicators = [
    "法律",
    "法规",
    "案例",
    "判例",
    "赔偿",
    "起诉",
    "合同",
    "协议",
    "维权",
    "纠纷",
  ];
  const matchCount = legalIndicators.filter((indicator) =>
    message.includes(indicator)
  ).length;
  if (matchCount >= 3) return true;

  // 3. 意图置信度较低可能需要多 Agent 协作
  if (intent.confidence < 0.7) return true;

  return false;
}

/**
 * 根据意图和复杂度确定需要的 Agent
 */
function determineAgents(
  intent: Intent,
  isComplex: boolean,
  config: RouterConfig
): AgentType[] {
  const primaryAgent = getAgentTypeForIntent(intent.intent);

  // 通用对话不需要法律 Agent
  if (primaryAgent === null) {
    return [];
  }

  // 简单问题只需要单个 Agent
  if (!isComplex || !config.enableMultiAgent) {
    return Array.isArray(primaryAgent) ? primaryAgent : [primaryAgent];
  }

  // 复杂问题可能需要多 Agent 协作
  const agents: AgentType[] = Array.isArray(primaryAgent)
    ? primaryAgent
    : [primaryAgent];

  // 法律咨询复杂问题可能需要先进行法律研究和案例分析
  if (intent.intent === LegalIntentType.LEGAL_CONSULTATION) {
    if (!agents.includes(AgentType.LEGAL_RESEARCH)) {
      agents.unshift(AgentType.LEGAL_RESEARCH);
    }
    if (!agents.includes(AgentType.CASE_ANALYSIS)) {
      agents.splice(1, 0, AgentType.CASE_ANALYSIS);
    }
  }

  // 文书起草可能需要先进行法律研究
  if (
    intent.intent === LegalIntentType.DOCUMENT_DRAFT &&
    !agents.includes(AgentType.LEGAL_RESEARCH)
  ) {
    agents.unshift(AgentType.LEGAL_RESEARCH);
  }

  return agents;
}

/**
 * 主路由函数 - 分析用户消息并决定调用哪些 Agent
 */
export async function routeToAgent(
  context: AgentContext,
  config: RouterConfig = defaultRouterConfig
): Promise<RoutingDecision> {
  // 1. 意图分类
  const intent = await classifyIntent(context.userMessage);

  // 2. 判断问题复杂度
  const isComplex = isComplexQuery(context.userMessage, intent);

  // 3. 确定需要的 Agent
  const selectedAgents = determineAgents(intent, isComplex, config);

  // 4. 获取 Agent 配置
  const agentConfigs: AgentConfig[] = [];
  for (const agentType of selectedAgents) {
    const agentConfig = agentRegistry.get(agentType);
    if (agentConfig) {
      agentConfigs.push(agentConfig);
    }
  }

  // 5. 生成路由原因
  let reason: string;
  if (selectedAgents.length === 0) {
    reason = `识别为通用对话（${intent.intent}），使用默认聊天模型`;
  } else if (selectedAgents.length === 1) {
    reason = `识别为${intent.intent}问题（置信度${(intent.confidence * 100).toFixed(0)}%），路由到${agentConfigs[0]?.name || selectedAgents[0]}`;
  } else {
    reason = `识别为复杂${intent.intent}问题，需要多 Agent 协作：${agentConfigs.map((c) => c.name).join(" → ")}`;
  }

  console.log("[Router]", reason);

  return {
    selectedAgents,
    requiresCollaboration: selectedAgents.length > 1,
    intent,
    reason,
    agentConfigs,
  };
}

/**
 * 检查是否应使用多 Agent 模式
 */
export function shouldUseMultiAgentMode(): boolean {
  return process.env.ENABLE_MULTI_AGENT !== "false";
}

// 导出注册表相关
export * from "./registry";
