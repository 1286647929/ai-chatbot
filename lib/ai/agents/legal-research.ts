import type { Tool } from "ai";
import { legalResearchPrompt } from "../prompts/legal/research";
import { combineWithIdentity } from "../prompts";
import { myProvider } from "../providers";
import { BaseAgent } from "./base";
import { type AgentConfig, AgentType } from "./types";

/**
 * Legal Research Agent 配置
 */
const legalResearchConfig: AgentConfig = {
  type: AgentType.LEGAL_RESEARCH,
  name: "法律研究",
  description:
    "专门负责法律法规检索、条文解读、法律依据查询。擅长解释法律条款的含义、适用范围和相关司法解释。",
  modelId: "legal-research-model",
  systemPrompt: combineWithIdentity(legalResearchPrompt),
  maxDuration: 30_000,
  maxTokens: 4096,
};

/**
 * 创建 Legal Research Agent
 * @param tools 可选的工具集（如 webSearch, regulationSearch）
 */
export function createLegalResearchAgent(
  tools?: Record<string, Tool>
): BaseAgent {
  const config: AgentConfig = {
    ...legalResearchConfig,
    tools,
  };

  return new BaseAgent(
    config,
    myProvider.languageModel("legal-research-model")
  );
}
