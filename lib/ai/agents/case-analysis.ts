import type { Tool } from "ai";
import { caseAnalysisPrompt } from "../prompts/legal/case-analysis";
import { myProvider } from "../providers";
import { BaseAgent } from "./base";
import { type AgentConfig, AgentType } from "./types";

/**
 * Case Analysis Agent 配置
 */
const caseAnalysisConfig: AgentConfig = {
  type: AgentType.CASE_ANALYSIS,
  name: "案例分析",
  description:
    "专门负责案例检索、判例分析、裁判结果预测。擅长查找类似案件，分析判决依据和赔偿标准。",
  modelId: "case-analysis-model",
  systemPrompt: caseAnalysisPrompt,
  maxDuration: 30_000,
  maxTokens: 4096,
};

/**
 * 创建 Case Analysis Agent
 * @param tools 可选的工具集（如 caseSearch, webSearch）
 */
export function createCaseAnalysisAgent(
  tools?: Record<string, Tool>
): BaseAgent {
  const config: AgentConfig = {
    ...caseAnalysisConfig,
    tools,
  };

  return new BaseAgent(config, myProvider.languageModel("case-analysis-model"));
}
