import { tool } from "ai";
import { z } from "zod";

/**
 * 案例搜索结果
 */
export interface CaseResult {
  /** 案号 */
  caseNumber: string;
  /** 案件名称 */
  caseName: string;
  /** 法院名称 */
  court: string;
  /** 案件类型 */
  caseType: string;
  /** 判决日期 */
  judgmentDate: string;
  /** 案情摘要 */
  summary: string;
  /** 裁判结果 */
  result?: string;
  /** 裁判要旨 */
  keyPoints?: string[];
  /** 来源链接 */
  url?: string;
  /** 是否为指导案例 */
  isGuidingCase?: boolean;
}

/**
 * Case Search 工具定义
 * 用于检索法律案例
 */
export const caseSearch = tool({
  description:
    "检索法律案例。可以按案由、关键词、法院层级等进行搜索。返回相关案例的摘要和裁判要旨。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词，可以是案由、事实描述等"),
    caseType: z
      .string()
      .optional()
      .describe("案件类型，如「民间借贷纠纷」「劳动争议」「合同纠纷」"),
    courtLevel: z
      .enum(["最高法", "高级法院", "中级法院", "基层法院", "全部"])
      .optional()
      .default("全部")
      .describe("法院层级"),
    yearRange: z
      .object({
        start: z.number().optional().describe("起始年份"),
        end: z.number().optional().describe("结束年份"),
      })
      .optional()
      .describe("判决年份范围"),
    onlyGuidingCases: z.boolean().default(false).describe("是否只搜索指导案例"),
    maxResults: z.number().min(1).max(10).default(5).describe("最大返回结果数"),
  }),
  execute: async (input) => {
    const {
      query,
      caseType,
      courtLevel,
      yearRange,
      onlyGuidingCases,
      maxResults,
    } = input;
    try {
      const results = await searchCases({
        query,
        caseType,
        courtLevel,
        yearRange,
        onlyGuidingCases,
        maxResults,
      });

      return {
        success: true,
        query,
        filters: { caseType, courtLevel, yearRange, onlyGuidingCases },
        results,
        count: results.length,
      };
    } catch (error) {
      console.error("[Case Search] Search failed:", error);
      return {
        success: false,
        query,
        error: error instanceof Error ? error.message : "案例检索失败",
        results: [],
        count: 0,
      };
    }
  },
});

/**
 * 案例搜索参数
 */
interface CaseSearchParams {
  query: string;
  caseType?: string;
  courtLevel?: string;
  yearRange?: {
    start?: number;
    end?: number;
  };
  onlyGuidingCases: boolean;
  maxResults: number;
}

/**
 * 执行案例搜索
 */
async function searchCases(params: CaseSearchParams): Promise<CaseResult[]> {
  // 检查是否配置了案例数据源 API
  if (process.env.CASE_DB_API_URL && process.env.CASE_DB_API_KEY) {
    try {
      return await searchExternalCaseDB(params);
    } catch (error) {
      console.warn("[Case Search] External DB failed, using fallback");
    }
  }

  // 使用模拟数据
  return getMockCases(params);
}

/**
 * 调用外部案例数据库 API
 */
async function searchExternalCaseDB(
  params: CaseSearchParams
): Promise<CaseResult[]> {
  const response = await fetch(`${process.env.CASE_DB_API_URL}/cases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CASE_DB_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      keyword: params.query,
      case_type: params.caseType,
      court_level: params.courtLevel,
      year_start: params.yearRange?.start,
      year_end: params.yearRange?.end,
      guiding_only: params.onlyGuidingCases,
      limit: params.maxResults,
    }),
  });

  if (!response.ok) {
    throw new Error(`Case DB API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map(
    (item: {
      case_number?: string;
      case_name?: string;
      court?: string;
      case_type?: string;
      judgment_date?: string;
      summary?: string;
      result?: string;
      key_points?: string[];
      url?: string;
      is_guiding?: boolean;
    }) => ({
      caseNumber: item.case_number || "",
      caseName: item.case_name || "",
      court: item.court || "",
      caseType: item.case_type || "",
      judgmentDate: item.judgment_date || "",
      summary: item.summary || "",
      result: item.result,
      keyPoints: item.key_points,
      url: item.url,
      isGuidingCase: item.is_guiding,
    })
  );
}

/**
 * 获取模拟案例数据
 */
function getMockCases(params: CaseSearchParams): CaseResult[] {
  const mockData: CaseResult[] = [
    {
      caseNumber: "(2023)最高法民终1号",
      caseName: "北京某公司与上海某公司买卖合同纠纷案",
      court: "最高人民法院",
      caseType: "合同纠纷",
      judgmentDate: "2023-06-15",
      summary:
        "本案系买卖合同纠纷。原告主张被告未按合同约定支付货款，要求被告支付货款及违约金。法院经审理认定合同有效，被告构成违约...",
      result: "判决被告支付货款人民币500万元及违约金50万元",
      keyPoints: ["买卖合同的成立与生效", "违约金的认定标准", "举证责任的分配"],
      isGuidingCase: false,
    },
    {
      caseNumber: "指导案例1号",
      caseName: "上海中原物业顾问有限公司诉陶德华居间合同纠纷案",
      court: "上海市第二中级人民法院",
      caseType: "居间合同纠纷",
      judgmentDate: "2009-12-17",
      summary:
        "房屋买卖居间合同中关于禁止买卖双方私下交易的约定，并不构成限制当事人正当民事权利的条款...",
      result: "原告诉讼请求部分支持",
      keyPoints: [
        '居间合同中"禁止跳单"条款的效力认定',
        "房屋买卖居间服务的报酬请求权",
      ],
      url: "https://www.court.gov.cn/zixun-xiangqing-13.html",
      isGuidingCase: true,
    },
    {
      caseNumber: "(2022)京01民终5678号",
      caseName: "张某与某科技公司劳动争议案",
      court: "北京市第一中级人民法院",
      caseType: "劳动争议",
      judgmentDate: "2022-11-20",
      summary:
        "劳动者主张用人单位违法解除劳动合同，要求支付赔偿金。法院认定用人单位在试用期内以不符合录用条件为由解除劳动合同，但未能提供充分证据...",
      result: "判决公司支付违法解除劳动合同赔偿金人民币8万元",
      keyPoints: [
        "试用期解除劳动合同的条件",
        "用人单位的举证责任",
        "违法解除的赔偿标准",
      ],
      isGuidingCase: false,
    },
    {
      caseNumber: "(2021)沪02民终9999号",
      caseName: "王某诉李某民间借贷纠纷案",
      court: "上海市第二中级人民法院",
      caseType: "民间借贷纠纷",
      judgmentDate: "2021-08-30",
      summary:
        "原告持借条起诉被告返还借款，被告抗辩已通过微信转账偿还。法院结合借条、微信转账记录、证人证言等证据综合认定...",
      result: "判决被告偿还借款人民币10万元及利息",
      keyPoints: ["借贷关系的认定", "电子证据的采信", "利息的计算方式"],
      isGuidingCase: false,
    },
    {
      caseNumber: "(2020)粤01刑终123号",
      caseName: "赵某诈骗案",
      court: "广东省广州市中级人民法院",
      caseType: "诈骗罪",
      judgmentDate: "2020-05-18",
      summary:
        "被告人以非法占有为目的，虚构投资项目，骗取被害人财物共计人民币200万元。法院认定其行为构成诈骗罪...",
      result: "判处有期徒刑十年，并处罚金人民币20万元",
      keyPoints: ["诈骗罪的构成要件", "数额特别巨大的认定", "从重处罚情节"],
      isGuidingCase: false,
    },
  ];

  // 根据查询条件过滤
  let results = mockData;

  if (params.onlyGuidingCases) {
    results = results.filter((r) => r.isGuidingCase);
  }

  if (params.caseType) {
    results = results.filter((r) => r.caseType.includes(params.caseType || ""));
  }

  if (params.courtLevel && params.courtLevel !== "全部") {
    results = results.filter((r) => r.court.includes(params.courtLevel || ""));
  }

  if (params.query) {
    const query = params.query.toLowerCase();
    results = results.filter(
      (r) =>
        r.caseName.toLowerCase().includes(query) ||
        r.summary.toLowerCase().includes(query) ||
        r.caseType.toLowerCase().includes(query)
    );
  }

  if (params.yearRange) {
    results = results.filter((r) => {
      const year = Number.parseInt(r.judgmentDate.split("-")[0], 10);
      const start = params.yearRange?.start || 0;
      const end = params.yearRange?.end || 9999;
      return year >= start && year <= end;
    });
  }

  return results.slice(0, params.maxResults);
}
