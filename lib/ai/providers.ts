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
        // 根据你 NewAPI 中配置的模型名称修改
        "chat-model": newapi("openai/gpt-4o-mini"),
        "chat-model-reasoning": wrapLanguageModel({
          model: newapi("openai/gpt-4o-mini"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": newapi("openai/gpt-4o-mini"),
        "artifact-model": newapi("openai/gpt-4o-mini"),
      },
    });
