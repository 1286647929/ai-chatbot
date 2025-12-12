import { z } from "zod";

/**
 * 法律意图分类枚举
 */
export const LegalIntentType = {
  /** 法律研究 - 查询法规、条文解读 */
  LEGAL_RESEARCH: "legal_research",
  /** 案例分析 - 案例检索、判例分析 */
  CASE_ANALYSIS: "case_analysis",
  /** 法律咨询 - 综合法律问题咨询 */
  LEGAL_CONSULTATION: "legal_consultation",
  /** 文书起草 - 合同、起诉状、律师函等 */
  DOCUMENT_DRAFT: "document_draft",
  /** 通用对话 - 非法律相关的闲聊 */
  GENERAL_CHAT: "general_chat",
} as const;

export type LegalIntentType =
  (typeof LegalIntentType)[keyof typeof LegalIntentType];

/**
 * 意图分类结果 Schema
 */
export const IntentSchema = z.object({
  /** 识别的意图类型 */
  intent: z.enum([
    "legal_research",
    "case_analysis",
    "legal_consultation",
    "document_draft",
    "general_chat",
  ]),
  /** 置信度 (0-1) */
  confidence: z.number().min(0).max(1),
  /** 分类来源 */
  layer: z.enum(["rule", "llm"]),
  /** 识别的关键词（规则匹配时） */
  matchedKeywords: z.array(z.string()).optional(),
  /** 分类理由（LLM 分类时） */
  reasoning: z.string().optional(),
  /** 提取的实体信息 */
  entities: z
    .object({
      /** 提及的法律名称 */
      laws: z.array(z.string()).optional(),
      /** 提及的案由 */
      caseTypes: z.array(z.string()).optional(),
      /** 文书类型 */
      documentType: z.string().optional(),
      /** 涉及的法律领域 */
      legalAreas: z.array(z.string()).optional(),
    })
    .optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

/**
 * LLM 意图分类输出 Schema（用于 generateObject）
 */
export const LLMIntentOutputSchema = z.object({
  intent: z.enum([
    "legal_research",
    "case_analysis",
    "legal_consultation",
    "document_draft",
    "general_chat",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  entities: z
    .object({
      laws: z.array(z.string()).optional(),
      caseTypes: z.array(z.string()).optional(),
      documentType: z.string().optional(),
      legalAreas: z.array(z.string()).optional(),
    })
    .optional(),
});

export type LLMIntentOutput = z.infer<typeof LLMIntentOutputSchema>;

/**
 * 意图分类配置
 */
export interface IntentClassifierConfig {
  /** 规则匹配置信度阈值，超过此值直接使用规则结果 */
  ruleConfidenceThreshold: number;
  /** LLM 分类最低置信度阈值 */
  llmConfidenceThreshold: number;
  /** 是否启用 LLM 分类 */
  enableLLMClassification: boolean;
}

/**
 * 默认分类器配置
 */
export const defaultClassifierConfig: IntentClassifierConfig = {
  ruleConfidenceThreshold: 0.85,
  llmConfidenceThreshold: 0.6,
  enableLLMClassification: true,
};

/**
 * 意图到 Agent 类型的映射
 */
export const intentToAgentMapping: Record<
  LegalIntentType,
  string | string[] | null
> = {
  [LegalIntentType.LEGAL_RESEARCH]: "legal-research",
  [LegalIntentType.CASE_ANALYSIS]: "case-analysis",
  [LegalIntentType.LEGAL_CONSULTATION]: "legal-advisor",
  [LegalIntentType.DOCUMENT_DRAFT]: "document-draft",
  [LegalIntentType.GENERAL_CHAT]: null, // 使用默认 chat 模型
};
