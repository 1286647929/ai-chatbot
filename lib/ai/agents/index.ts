// 类型导出

// 基础 Agent
export * from "./base";
export * from "./case-analysis";
export * from "./document-draft";
export * from "./legal-advisor";
export * from "./legal-research";
// 专业 Agent
export * from "./router";
export * from "./types";

import type { Tool } from "ai";
import type { BaseAgent } from "./base";
import { createCaseAnalysisAgent } from "./case-analysis";
import { createDocumentDraftAgent } from "./document-draft";
import { createLegalAdvisorAgent } from "./legal-advisor";
import { createLegalResearchAgent } from "./legal-research";
// Agent 工厂函数
import { createRouterAgent } from "./router";
import { AgentType } from "./types";

/**
 * Agent 工厂映射
 */
export const agentFactories: Record<
  AgentType,
  (tools?: Record<string, Tool>) => BaseAgent
> = {
  [AgentType.ROUTER]: createRouterAgent,
  [AgentType.LEGAL_RESEARCH]: createLegalResearchAgent,
  [AgentType.CASE_ANALYSIS]: createCaseAnalysisAgent,
  [AgentType.LEGAL_ADVISOR]: createLegalAdvisorAgent,
  [AgentType.DOCUMENT_DRAFT]: createDocumentDraftAgent,
};

/**
 * 根据类型创建 Agent
 */
export function createAgent(
  type: AgentType,
  tools?: Record<string, Tool>
): BaseAgent {
  const factory = agentFactories[type];
  if (!factory) {
    throw new Error(`Unknown agent type: ${type}`);
  }
  return factory(tools);
}
