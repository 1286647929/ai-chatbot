/**
 * 模型配置中心
 *
 * 按对话模式配置模型，前端选择模式，后端自动使用对应的模型。
 * 简洁统一，添加新模式只需在此文件配置即可。
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// ============================================================================
// NewAPI 客户端
// ============================================================================

const newapi = createOpenAI({
  baseURL: process.env.NEWAPI_BASE_URL,
  apiKey: process.env.NEWAPI_API_KEY,
});

// ============================================================================
// 模式配置
// ============================================================================

/**
 * 模式配置
 * key: 模式名称（对应前端 agentMode）
 * value: 该模式使用的模型配置
 */
export const MODE_MODELS = {
  // 默认聊天模式
  default: {
    chat: "claude-sonnet-4.5-think",
    title: "openai/gpt-4.1-mini",
    artifact: "openai/gpt-4.1-mini",
  },

  // 法律助手模式
  legal: {
    chat: "claude-sonnet-4.5-think",
    intent: "openai/gpt-4.1-mini",
    research: "claude-sonnet-4.5-think",
    caseAnalysis: "claude-sonnet-4.5-think",
    advisor: "claude-sonnet-4.5-think",
    documentDraft: "claude-sonnet-4.5-think",
  },
} as const;

/**
 * 模式类型
 */
export type AgentMode = keyof typeof MODE_MODELS;

/**
 * 默认模式（用于 cookie 存储等）
 */
export const DEFAULT_CHAT_MODEL = "default";

// ============================================================================
// 模型获取函数
// ============================================================================

/**
 * 获取指定模式的聊天模型
 */
export function getChatModel(mode: AgentMode = "default") {
  const modelId = MODE_MODELS[mode]?.chat ?? MODE_MODELS.default.chat;
  return newapi.chat(modelId);
}

/**
 * 获取指定模式的聊天模型（带推理能力）
 */
export function getChatModelWithReasoning(mode: AgentMode = "default") {
  const modelId = MODE_MODELS[mode]?.chat ?? MODE_MODELS.default.chat;
  return wrapLanguageModel({
    model: newapi.chat(modelId),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
}

/**
 * 获取标题生成模型
 */
export function getTitleModel() {
  return newapi.chat(MODE_MODELS.default.title);
}

/**
 * 获取 Artifact 生成模型
 */
export function getArtifactModel() {
  return newapi.chat(MODE_MODELS.default.artifact);
}

/**
 * 获取法律助手的各专业模型
 */
export const legalModels = {
  getIntentModel: () => newapi.chat(MODE_MODELS.legal.intent),
  getResearchModel: () => newapi.chat(MODE_MODELS.legal.research),
  getCaseAnalysisModel: () => newapi.chat(MODE_MODELS.legal.caseAnalysis),
  getAdvisorModel: () => newapi.chat(MODE_MODELS.legal.advisor),
  getDocumentDraftModel: () => newapi.chat(MODE_MODELS.legal.documentDraft),
};

// ============================================================================
// Web 搜索能力检测
// ============================================================================

/**
 * 常见联网模型 ID 模式
 */
export const WEB_SEARCH_MODEL_PATTERNS = [
  /sonar.*online/i, // Perplexity sonar online 系列
  /browsing/i, // OpenAI browsing
  /alltools/i, // 智谱 alltools
  /web[-_]?search/i, // 通用 web search 模式
  /realtime/i, // 实时模型
] as const;

/**
 * 检查模型是否自带联网搜索能力
 */
export function modelSupportsWebSearch(modelId: string): boolean {
  return WEB_SEARCH_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
}

/**
 * 根据模型 ID 推测是否支持联网
 */
export function inferWebSearchSupport(modelId: string): boolean {
  return WEB_SEARCH_MODEL_PATTERNS.some((pattern) => pattern.test(modelId));
}
