import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// 创建 NewAPI 客户端
const newapi = createOpenAI({
  baseURL: process.env.NEWAPI_BASE_URL,
  apiKey: process.env.NEWAPI_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // 使用 newapi.chat() 强制使用标准 Chat Completions API (/v1/chat/completions)
        // 而不是 newapi() 默认的 Responses API (/v1/responses)
        "chat-model": newapi.chat("claude-sonnet-4.5"),
        "chat-model-reasoning": wrapLanguageModel({
          model: newapi.chat("claude-sonnet-4.5"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": newapi.chat("claude-sonnet-4.5"),
        "artifact-model": newapi.chat("claude-sonnet-4.5"),
        // 法律多 Agent 系统模型配置
        "intent-model": newapi.chat("claude-sonnet-4.5"), // 意图识别 - 快速、低成本
        "legal-research-model": newapi.chat("claude-sonnet-4.5"), // 法律研究 - 高质量
        "case-analysis-model": newapi.chat("claude-sonnet-4.5"), // 案例分析 - 高质量
        "legal-advisor-model": newapi.chat("claude-sonnet-4.5"), // 法律顾问 - 高质量
        "document-draft-model": newapi.chat("claude-sonnet-4.5"), // 文书起草 - 高质量
      },
    });
