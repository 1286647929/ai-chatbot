import { generateObject } from "ai";
import { myProvider } from "../providers";
import { isLegalRelated, ruleBasedClassify } from "./rules";
import {
  defaultClassifierConfig,
  type Intent,
  type IntentClassifierConfig,
  LegalIntentType,
  LLMIntentOutputSchema,
} from "./schema";

/**
 * 意图分类系统 prompt
 */
const INTENT_CLASSIFICATION_PROMPT = `你是一个法律意图识别专家。根据用户的输入，判断用户的意图类型。

意图类型说明：
1. legal_research（法律研究）：用户想要查询法律法规、条文解读、法律依据
2. case_analysis（案例分析）：用户想要检索案例、分析判例、了解类似案件的判决结果
3. legal_consultation（法律咨询）：用户有具体的法律问题需要咨询，想知道如何处理法律纠纷
4. document_draft（文书起草）：用户需要起草法律文书，如合同、起诉状、律师函等
5. general_chat（通用对话）：非法律相关的闲聊、问候等

判断规则：
- 如果用户询问"法律怎么规定"、"有什么法条"等，选择 legal_research
- 如果用户问"类似案例"、"法院怎么判"、"判决结果"等，选择 case_analysis
- 如果用户描述具体情况并问"怎么办"、"如何维权"、"能否起诉"等，选择 legal_consultation
- 如果用户要求"帮我写"、"起草"、"模板"等与文书相关，选择 document_draft
- 如果无法判断或明显与法律无关，选择 general_chat

请基于用户输入进行分析，返回意图类型、置信度和分析理由。`;

/**
 * 使用 LLM 进行意图分类
 */
async function llmClassify(message: string): Promise<Intent> {
  try {
    const result = await generateObject({
      model: myProvider.languageModel("intent-model"),
      schema: LLMIntentOutputSchema,
      system: INTENT_CLASSIFICATION_PROMPT,
      prompt: `用户输入：${message}`,
    });

    return {
      intent: result.object.intent,
      confidence: result.object.confidence,
      layer: "llm",
      reasoning: result.object.reasoning,
      entities: result.object.entities,
    };
  } catch (error) {
    console.error("[Intent Classifier] LLM classification failed:", error);
    // 降级处理：返回法律咨询类型（最通用的法律意图）
    return {
      intent: LegalIntentType.LEGAL_CONSULTATION,
      confidence: 0.5,
      layer: "llm",
      reasoning: "LLM 分类失败，降级为通用法律咨询",
    };
  }
}

/**
 * 组合意图分类器
 * 两层架构：规则匹配 + LLM 分类
 */
export async function classifyIntent(
  message: string,
  config: IntentClassifierConfig = defaultClassifierConfig
): Promise<Intent> {
  const startTime = Date.now();

  // Layer 1: 规则匹配（~0ms）
  const ruleResult = ruleBasedClassify(message);

  if (ruleResult && ruleResult.confidence >= config.ruleConfidenceThreshold) {
    console.log(
      "[Intent Classifier] Rule-based classification:",
      ruleResult.intent,
      `(confidence: ${ruleResult.confidence}, time: ${Date.now() - startTime}ms)`
    );
    return ruleResult;
  }

  // 快速过滤：如果明显不是法律问题，直接返回通用对话
  if (!isLegalRelated(message) && !ruleResult) {
    console.log(
      "[Intent Classifier] Not legal related, returning general_chat",
      `(time: ${Date.now() - startTime}ms)`
    );
    return {
      intent: LegalIntentType.GENERAL_CHAT,
      confidence: 0.8,
      layer: "rule",
    };
  }

  // Layer 2: LLM 分类（~400ms）
  if (config.enableLLMClassification) {
    const llmResult = await llmClassify(message);

    console.log(
      "[Intent Classifier] LLM classification:",
      llmResult.intent,
      `(confidence: ${llmResult.confidence}, time: ${Date.now() - startTime}ms)`
    );

    // 如果规则有结果但置信度不够，比较两者
    if (ruleResult) {
      // 如果 LLM 和规则结果一致，提升置信度
      if (ruleResult.intent === llmResult.intent) {
        return {
          ...llmResult,
          confidence: Math.min(
            (ruleResult.confidence + llmResult.confidence) / 2 + 0.1,
            0.95
          ),
          matchedKeywords: ruleResult.matchedKeywords,
        };
      }
      // 如果不一致，选择置信度更高的
      if (ruleResult.confidence > llmResult.confidence) {
        return ruleResult;
      }
    }

    return llmResult;
  }

  // 如果禁用了 LLM 分类，返回规则结果或默认值
  if (ruleResult) {
    return ruleResult;
  }

  return {
    intent: LegalIntentType.LEGAL_CONSULTATION,
    confidence: 0.5,
    layer: "rule",
  };
}

/**
 * 批量分类（用于预热或测试）
 */
export async function batchClassify(
  messages: string[],
  config?: IntentClassifierConfig
): Promise<Intent[]> {
  return Promise.all(messages.map((msg) => classifyIntent(msg, config)));
}
