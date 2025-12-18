import { routerPrompt } from "../prompts/legal/router";
import { combineWithIdentity } from "../prompts";
import { myProvider } from "../providers";
import { BaseAgent } from "./base";
import { type AgentConfig, AgentType } from "./types";

/**
 * Router Agent 配置
 */
const routerConfig: AgentConfig = {
  type: AgentType.ROUTER,
  name: "路由决策",
  description: "分析用户问题，决定调用哪些专业 Agent 处理",
  modelId: "intent-model",
  systemPrompt: combineWithIdentity(routerPrompt),
  maxDuration: 10_000,
  maxTokens: 1024,
};

/**
 * 创建 Router Agent
 */
export function createRouterAgent(): BaseAgent {
  return new BaseAgent(routerConfig, myProvider.languageModel("intent-model"));
}
