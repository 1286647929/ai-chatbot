import { tool } from "ai";
import { z } from "zod";

/**
 * 法规搜索结果
 */
export interface RegulationResult {
  /** 法律名称 */
  lawName: string;
  /** 条款号 */
  articleNumber: string;
  /** 条文内容 */
  content: string;
  /** 发布日期 */
  publishDate?: string;
  /** 实施日期 */
  effectiveDate?: string;
  /** 法律状态 */
  status?: "有效" | "已修订" | "已废止";
  /** 来源链接 */
  url?: string;
}

/**
 * Regulation Search 工具定义
 * 用于检索法律法规条文
 */
export const regulationSearch = tool({
  description:
    "检索法律法规条文。可以按法律名称、关键词、法律领域等进行搜索。返回相关的法律条文及解释。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，可以是法律名称、条文关键词等"),
    lawName: z
      .string()
      .optional()
      .describe("指定法律名称，如「民法典」「刑法」"),
    articleNumber: z
      .string()
      .optional()
      .describe("指定条款号，如「第一百零三条」"),
    legalArea: z
      .string()
      .optional()
      .describe("法律领域，如「民事」「刑事」「行政」「劳动」"),
    maxResults: z.number().min(1).max(10).default(5).describe("最大返回结果数"),
  }),
  execute: async (input) => {
    const { query, lawName, articleNumber, legalArea, maxResults } = input;
    try {
      const results = await searchRegulations({
        query,
        lawName,
        articleNumber,
        legalArea,
        maxResults,
      });

      return {
        success: true,
        query,
        filters: { lawName, articleNumber, legalArea },
        results,
        count: results.length,
      };
    } catch (error) {
      console.error("[Regulation Search] Search failed:", error);
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : "法规检索失败",
        results: [],
        count: 0,
      };
    }
  },
});

/**
 * 法规搜索参数
 */
interface RegulationSearchParams {
  query: string;
  lawName?: string;
  articleNumber?: string;
  legalArea?: string;
  maxResults: number;
}

/**
 * 执行法规搜索
 */
async function searchRegulations(
  params: RegulationSearchParams
): Promise<RegulationResult[]> {
  // 检查是否配置了法律数据源 API
  if (process.env.LEGAL_DB_API_URL && process.env.LEGAL_DB_API_KEY) {
    try {
      return await searchExternalLegalDB(params);
    } catch (error) {
      console.warn("[Regulation Search] External DB failed, using fallback");
    }
  }

  // 使用模拟数据（开发环境或未配置外部数据源时）
  return getMockRegulations(params);
}

/**
 * 调用外部法律数据库 API
 */
async function searchExternalLegalDB(
  params: RegulationSearchParams
): Promise<RegulationResult[]> {
  const response = await fetch(`${process.env.LEGAL_DB_API_URL}/regulations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LEGAL_DB_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keyword: params.query,
      law_name: params.lawName,
      article: params.articleNumber,
      area: params.legalArea,
      limit: params.maxResults,
    }),
  });

  if (!response.ok) {
    throw new Error(`Legal DB API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map(
    (item: {
      law_name?: string;
      article_number?: string;
      content?: string;
      publish_date?: string;
      effective_date?: string;
      status?: string;
      url?: string;
    }) => ({
      lawName: item.law_name || "",
      articleNumber: item.article_number || "",
      content: item.content || "",
      publishDate: item.publish_date,
      effectiveDate: item.effective_date,
      status: item.status as "有效" | "已修订" | "已废止" | undefined,
      url: item.url,
    })
  );
}

/**
 * 获取模拟法规数据
 */
function getMockRegulations(
  params: RegulationSearchParams
): RegulationResult[] {
  // 常用法律条文示例数据
  const mockData: RegulationResult[] = [
    {
      lawName: "中华人民共和国民法典",
      articleNumber: "第一百四十三条",
      content:
        "具备下列条件的民事法律行为有效：（一）行为人具有相应的民事行为能力；（二）意思表示真实；（三）不违反法律、行政法规的强制性规定，不违背公序良俗。",
      publishDate: "2020-05-28",
      effectiveDate: "2021-01-01",
      status: "有效",
      url: "https://flk.npc.gov.cn/detail2.html?ZmY4MDgxODE3MmE2NTBjNDAxNzJiY2Y5OTg0MjB=",
    },
    {
      lawName: "中华人民共和国民法典",
      articleNumber: "第五百七十七条",
      content:
        "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
      publishDate: "2020-05-28",
      effectiveDate: "2021-01-01",
      status: "有效",
    },
    {
      lawName: "中华人民共和国劳动合同法",
      articleNumber: "第三十八条",
      content:
        "用人单位有下列情形之一的，劳动者可以解除劳动合同：（一）未按照劳动合同约定提供劳动保护或者劳动条件的；（二）未及时足额支付劳动报酬的；（三）未依法为劳动者缴纳社会保险费的...",
      publishDate: "2007-06-29",
      effectiveDate: "2008-01-01",
      status: "有效",
    },
    {
      lawName: "中华人民共和国刑法",
      articleNumber: "第二百六十六条",
      content:
        "诈骗公私财物，数额较大的，处三年以下有期徒刑、拘役或者管制，并处或者单处罚金；数额巨大或者有其他严重情节的，处三年以上十年以下有期徒刑，并处罚金...",
      publishDate: "1979-07-01",
      effectiveDate: "1980-01-01",
      status: "有效",
    },
    {
      lawName: "中华人民共和国消费者权益保护法",
      articleNumber: "第二十五条",
      content:
        "经营者采用网络、电视、电话、邮购等方式销售商品，消费者有权自收到商品之日起七日内退货，且无需说明理由...",
      publishDate: "2013-10-25",
      effectiveDate: "2014-03-15",
      status: "有效",
    },
  ];

  // 根据查询条件过滤
  let results = mockData;

  if (params.lawName) {
    results = results.filter((r) => r.lawName.includes(params.lawName || ""));
  }

  if (params.articleNumber) {
    results = results.filter((r) =>
      r.articleNumber.includes(params.articleNumber || "")
    );
  }

  if (params.query) {
    const query = params.query.toLowerCase();
    results = results.filter(
      (r) =>
        r.lawName.toLowerCase().includes(query) ||
        r.content.toLowerCase().includes(query)
    );
  }

  return results.slice(0, params.maxResults);
}
