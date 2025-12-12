import type { Tool } from "ai";
import { documentDraftPrompt } from "../prompts/legal/document-draft";
import { myProvider } from "../providers";
import { BaseAgent } from "./base";
import { type AgentConfig, AgentType } from "./types";

/**
 * Document Draft Agent 配置
 */
const documentDraftConfig: AgentConfig = {
  type: AgentType.DOCUMENT_DRAFT,
  name: "文书起草",
  description:
    "专门负责法律文书起草，包括合同、起诉状、律师函、声明书等。能够根据具体情况生成规范的法律文书。",
  modelId: "document-draft-model",
  systemPrompt: documentDraftPrompt,
  maxDuration: 60_000,
  maxTokens: 16_384,
};

/**
 * 创建 Document Draft Agent
 * @param tools 可选的工具集（如 createDocument, templateSearch）
 */
export function createDocumentDraftAgent(
  tools?: Record<string, Tool>
): BaseAgent {
  const config: AgentConfig = {
    ...documentDraftConfig,
    tools,
  };

  return new BaseAgent(
    config,
    myProvider.languageModel("document-draft-model")
  );
}
