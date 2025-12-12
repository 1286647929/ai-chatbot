import type { Tool } from "ai";
import { type AgentConfig, AgentType } from "../agents/types";

/**
 * Agent 注册表
 * 存储所有 Agent 的配置信息
 */
class AgentRegistry {
  private agents: Map<AgentType, AgentConfig> = new Map();

  /**
   * 注册 Agent
   */
  register(config: AgentConfig): void {
    this.agents.set(config.type, config);
  }

  /**
   * 获取 Agent 配置
   */
  get(type: AgentType): AgentConfig | undefined {
    return this.agents.get(type);
  }

  /**
   * 获取所有 Agent 配置
   */
  getAll(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * 检查 Agent 是否已注册
   */
  has(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * 获取 Agent 列表（用于路由决策）
   */
  getAgentList(): Array<{
    type: AgentType;
    name: string;
    description: string;
  }> {
    return Array.from(this.agents.values()).map((config) => ({
      type: config.type,
      name: config.name,
      description: config.description,
    }));
  }
}

// 全局注册表实例
export const agentRegistry = new AgentRegistry();

/**
 * 注册所有法律专业 Agent
 * 工具在 Agent 实现时动态注入
 */
export function registerLegalAgents(
  tools: Record<string, Record<string, Tool>>
): void {
  // Router Agent
  agentRegistry.register({
    type: AgentType.ROUTER,
    name: "路由决策",
    description: "分析用户问题，决定调用哪些专业 Agent 处理",
    modelId: "intent-model",
    systemPrompt: "", // 在 router agent 实现中定义
    maxDuration: 10_000,
  });

  // Legal Research Agent
  agentRegistry.register({
    type: AgentType.LEGAL_RESEARCH,
    name: "法律研究",
    description:
      "专门负责法律法规检索、条文解读、法律依据查询。擅长解释法律条款的含义、适用范围和相关司法解释。",
    modelId: "legal-research-model",
    systemPrompt: "", // 在 agent 实现中定义
    tools: tools.legalResearch || {},
    maxDuration: 30_000,
    maxTokens: 4096,
  });

  // Case Analysis Agent
  agentRegistry.register({
    type: AgentType.CASE_ANALYSIS,
    name: "案例分析",
    description:
      "专门负责案例检索、判例分析、裁判结果预测。擅长查找类似案件，分析判决依据和赔偿标准。",
    modelId: "case-analysis-model",
    systemPrompt: "", // 在 agent 实现中定义
    tools: tools.caseAnalysis || {},
    maxDuration: 30_000,
    maxTokens: 4096,
  });

  // Legal Advisor Agent
  agentRegistry.register({
    type: AgentType.LEGAL_ADVISOR,
    name: "法律顾问",
    description:
      "综合性法律咨询专家，整合法律研究和案例分析结果，为用户提供全面的法律建议和解决方案。",
    modelId: "legal-advisor-model",
    systemPrompt: "", // 在 agent 实现中定义
    maxDuration: 45_000,
    maxTokens: 8192,
  });

  // Document Draft Agent
  agentRegistry.register({
    type: AgentType.DOCUMENT_DRAFT,
    name: "文书起草",
    description:
      "专门负责法律文书起草，包括合同、起诉状、律师函、声明书等。能够根据具体情况生成规范的法律文书。",
    modelId: "document-draft-model",
    systemPrompt: "", // 在 agent 实现中定义
    tools: tools.documentDraft || {},
    maxDuration: 60_000,
    maxTokens: 16_384,
  });
}

/**
 * 初始化注册表（无工具版本，工具稍后注入）
 */
export function initializeRegistry(): void {
  registerLegalAgents({});
}

/**
 * 根据意图获取推荐的 Agent 类型
 */
export function getAgentTypeForIntent(
  intent: string
): AgentType | AgentType[] | null {
  const intentToAgentMap: Record<string, AgentType | AgentType[] | null> = {
    legal_research: AgentType.LEGAL_RESEARCH,
    case_analysis: AgentType.CASE_ANALYSIS,
    legal_consultation: AgentType.LEGAL_ADVISOR,
    document_draft: AgentType.DOCUMENT_DRAFT,
    general_chat: null,
  };

  return intentToAgentMap[intent] ?? null;
}
