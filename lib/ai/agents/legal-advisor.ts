import type { Tool } from "ai";
import { legalAdvisorPrompt } from "../prompts/legal/advisor";
import { myProvider } from "../providers";
import { BaseAgent } from "./base";
import { type AgentConfig, AgentType } from "./types";

/**
 * Legal Advisor Agent 配置
 */
const legalAdvisorConfig: AgentConfig = {
  type: AgentType.LEGAL_ADVISOR,
  name: "法律顾问",
  description:
    "综合性法律咨询专家，整合法律研究和案例分析结果，为用户提供全面的法律建议和解决方案。",
  modelId: "legal-advisor-model",
  systemPrompt: legalAdvisorPrompt,
  maxDuration: 45_000,
  maxTokens: 8192,
};

/**
 * 创建 Legal Advisor Agent
 * @param tools 可选的工具集
 */
export function createLegalAdvisorAgent(
  tools?: Record<string, Tool>
): BaseAgent {
  const config: AgentConfig = {
    ...legalAdvisorConfig,
    tools,
  };

  return new BaseAgent(config, myProvider.languageModel("legal-advisor-model"));
}
