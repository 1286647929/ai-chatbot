import type { Intent } from "./schema";
import { LegalIntentType } from "./schema";

/**
 * 关键词规则定义
 */
interface KeywordRule {
  /** 意图类型 */
  intent: LegalIntentType;
  /** 触发关键词（包含任一即匹配） */
  keywords: string[];
  /** 排除关键词（包含则不匹配） */
  excludeKeywords?: string[];
  /** 基础置信度 */
  baseConfidence: number;
  /** 额外权重关键词（匹配越多置信度越高） */
  boostKeywords?: string[];
}

/**
 * 关键词规则配置
 */
const keywordRules: KeywordRule[] = [
  // 法律研究 - 查询法规、条文解读
  {
    intent: LegalIntentType.LEGAL_RESEARCH,
    keywords: [
      "法规",
      "法条",
      "条文",
      "法律规定",
      "司法解释",
      "立法",
      "法律依据",
      "法律条款",
      "第几条",
      "第几款",
      "民法典",
      "刑法",
      "劳动法",
      "合同法",
      "公司法",
      "婚姻法",
      "继承法",
      "物权法",
      "侵权责任法",
      "行政诉讼法",
      "刑事诉讼法",
      "民事诉讼法",
      "法律是怎么规定",
      "法律怎么说",
      "有什么法律",
      "法律有没有",
    ],
    excludeKeywords: ["案例", "判决", "裁判"],
    baseConfidence: 0.75,
    boostKeywords: ["查询", "检索", "查找", "解读", "释义", "解释"],
  },

  // 案例分析 - 案例检索、判例分析
  {
    intent: LegalIntentType.CASE_ANALYSIS,
    keywords: [
      "案例",
      "判例",
      "判决",
      "裁判",
      "审判",
      "法院",
      "判决书",
      "裁定书",
      "裁判文书",
      "类似案件",
      "相似案例",
      "指导案例",
      "公报案例",
      "典型案例",
      "先例",
      "怎么判",
      "判几年",
      "赔偿多少",
      "胜诉率",
      "败诉",
    ],
    baseConfidence: 0.8,
    boostKeywords: ["分析", "检索", "查找", "参考", "借鉴"],
  },

  // 文书起草 - 合同、起诉状、律师函等
  {
    intent: LegalIntentType.DOCUMENT_DRAFT,
    keywords: [
      "起草",
      "拟定",
      "撰写",
      "写一份",
      "帮我写",
      "模板",
      "范本",
      "格式",
      "合同",
      "协议",
      "起诉状",
      "答辩状",
      "上诉状",
      "申诉状",
      "律师函",
      "催告函",
      "声明书",
      "委托书",
      "授权书",
      "承诺书",
      "保证书",
      "遗嘱",
      "借条",
      "欠条",
      "收据",
    ],
    baseConfidence: 0.85,
    boostKeywords: ["生成", "制作", "出具"],
  },

  // 法律咨询 - 综合法律问题
  {
    intent: LegalIntentType.LEGAL_CONSULTATION,
    keywords: [
      "法律问题",
      "法律咨询",
      "怎么办",
      "如何处理",
      "该怎么做",
      "合法吗",
      "违法吗",
      "犯法吗",
      "能不能",
      "可以吗",
      "有权",
      "有义务",
      "责任",
      "赔偿",
      "维权",
      "追诉",
      "诉讼",
      "仲裁",
      "调解",
      "纠纷",
      "争议",
      "侵权",
      "违约",
      "欺诈",
      "被骗",
      "受害",
      "索赔",
      "讨回",
      "追回",
    ],
    excludeKeywords: ["案例", "判决", "起草", "模板"],
    baseConfidence: 0.7,
    boostKeywords: ["咨询", "请问", "想问", "请教"],
  },
];

/**
 * 通用对话关键词（明确的非法律话题）
 */
const generalChatKeywords = [
  "你好",
  "您好",
  "嗨",
  "早上好",
  "下午好",
  "晚上好",
  "谢谢",
  "感谢",
  "再见",
  "拜拜",
  "天气",
  "吃饭",
  "聊天",
  "无聊",
  "开心",
  "难过",
  "笑话",
  "故事",
];

/**
 * 计算文本中关键词匹配情况
 */
function matchKeywords(
  text: string,
  keywords: string[]
): { matched: string[]; count: number } {
  const matched: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matched.push(keyword);
    }
  }
  return { matched, count: matched.length };
}

/**
 * 基于规则的意图分类
 * @param message 用户消息
 * @returns 分类结果，如果无法确定则返回 null
 */
export function ruleBasedClassify(message: string): Intent | null {
  const text = message.toLowerCase();

  // 1. 先检查是否为明确的通用对话
  const generalMatch = matchKeywords(text, generalChatKeywords);
  if (generalMatch.count > 0 && text.length < 20) {
    // 短消息且包含通用对话关键词
    return {
      intent: LegalIntentType.GENERAL_CHAT,
      confidence: 0.9,
      layer: "rule",
      matchedKeywords: generalMatch.matched,
    };
  }

  // 2. 遍历法律意图规则，找到最佳匹配
  let bestMatch: {
    rule: KeywordRule;
    confidence: number;
    matchedKeywords: string[];
  } | null = null;

  for (const rule of keywordRules) {
    // 检查是否包含排除关键词
    if (rule.excludeKeywords) {
      const excludeMatch = matchKeywords(text, rule.excludeKeywords);
      if (excludeMatch.count > 0) {
        continue;
      }
    }

    // 检查主关键词匹配
    const mainMatch = matchKeywords(text, rule.keywords);
    if (mainMatch.count === 0) {
      continue;
    }

    // 计算置信度
    let confidence = rule.baseConfidence;

    // 根据匹配的关键词数量调整置信度
    if (mainMatch.count > 1) {
      confidence += Math.min(mainMatch.count - 1, 3) * 0.05;
    }

    // 检查权重关键词
    if (rule.boostKeywords) {
      const boostMatch = matchKeywords(text, rule.boostKeywords);
      confidence += boostMatch.count * 0.03;
    }

    // 限制最大置信度
    confidence = Math.min(confidence, 0.95);

    // 更新最佳匹配
    if (!bestMatch || confidence > bestMatch.confidence) {
      bestMatch = {
        rule,
        confidence,
        matchedKeywords: mainMatch.matched,
      };
    }
  }

  if (bestMatch) {
    return {
      intent: bestMatch.rule.intent,
      confidence: bestMatch.confidence,
      layer: "rule",
      matchedKeywords: bestMatch.matchedKeywords,
    };
  }

  // 3. 无法确定，返回 null 交给 LLM 分类
  return null;
}

/**
 * 检查是否为法律相关问题（快速过滤）
 */
export function isLegalRelated(message: string): boolean {
  const legalIndicators = [
    "法",
    "律",
    "诉",
    "判",
    "案",
    "罪",
    "权",
    "责",
    "合同",
    "协议",
    "赔偿",
    "违约",
    "侵权",
    "纠纷",
    "仲裁",
    "调解",
    "起诉",
    "被告",
    "原告",
    "证据",
    "证人",
    "法院",
    "检察院",
    "公安",
    "警察",
    "律师",
    "法官",
    "检察官",
  ];

  return legalIndicators.some((indicator) => message.includes(indicator));
}
