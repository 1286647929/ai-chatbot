import { tool } from "ai";
import { z } from "zod";
import {
  type CacheType,
  generateSearchCacheKey,
  getTTLForType,
  tieredCache,
} from "../../../cache";

/**
 * 搜索类型
 */
export const SearchType = {
  NEWS: "news",
  REGULATION: "regulation",
  CASE: "case",
  GENERAL: "general",
} as const;

export type SearchType = (typeof SearchType)[keyof typeof SearchType];

/**
 * 搜索结果
 */
export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  date?: string;
};

/**
 * 搜索结果包装（包含缓存状态）
 */
type SearchResponse = {
  success: boolean;
  query: string;
  type: SearchType;
  results: SearchResult[];
  count: number;
  cached?: boolean;
  error?: string;
};

/**
 * Web Search 工具定义
 * 用于搜索网络获取法律相关信息
 */
export const webSearch = tool({
  description:
    "搜索网络获取法律相关信息，包括法律新闻、法规、案例等。使用此工具时请指定搜索类型以获得更精准的结果。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词"),
    type: z
      .enum(["news", "regulation", "case", "general"])
      .default("general")
      .describe(
        "搜索类型：news-新闻、regulation-法规、case-案例、general-通用"
      ),
    maxResults: z.number().min(1).max(10).default(5).describe("最大返回结果数"),
  }),
  execute: async (input): Promise<SearchResponse> => {
    const { query, type, maxResults } = input;
    // 根据搜索类型构建增强查询
    const enhancedQuery = buildEnhancedQuery(query, type);

    // 生成缓存键
    const cacheKey = generateSearchCacheKey(type as CacheType, enhancedQuery, {
      maxResults,
    });

    try {
      // 使用分层缓存
      const results = await tieredCache.getOrSet<SearchResult[]>(
        cacheKey,
        () => executeSearchWithoutCache(enhancedQuery, type, maxResults),
        getTTLForType(type as CacheType)
      );

      return {
        success: true,
        query: enhancedQuery,
        type,
        results,
        count: results.length,
        cached: true, // 可能来自缓存
      };
    } catch (error) {
      console.error("[Web Search] Search failed:", error);
      return {
        success: false,
        query: enhancedQuery,
        type,
        error: error instanceof Error ? error.message : "搜索失败",
        results: [],
        count: 0,
      };
    }
  },
});

/**
 * 构建增强查询
 */
function buildEnhancedQuery(query: string, type: SearchType): string {
  const suffixes: Record<SearchType, string> = {
    news: "法律新闻 最新",
    regulation: "法律法规 条文",
    case: "案例 判决 裁判文书",
    general: "法律",
  };

  // 如果查询已经包含相关关键词，不再添加
  const suffix = suffixes[type];
  const keywords = suffix.split(" ");
  const hasKeyword = keywords.some((k) => query.includes(k));

  return hasKeyword ? query : `${query} ${suffix}`;
}

/**
 * 执行搜索（不带缓存）
 * 支持多种搜索 API 的降级策略
 * 优先级：Perplexity → Bing → 智谱 → Google → Exa → Tavily → SerpAPI → Mock
 */
async function executeSearchWithoutCache(
  query: string,
  type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  // 1. 检查是否配置了 Perplexity API（推荐）
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      return await searchWithPerplexity(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] Perplexity search failed, trying fallback");
    }
  }

  // 2. 检查是否配置了 Bing Search API（国内可用）
  if (process.env.BING_SEARCH_API_KEY) {
    try {
      return await searchWithBing(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] Bing search failed, trying fallback");
    }
  }

  // 3. 检查是否配置了智谱 AI（国产大模型）
  if (process.env.ZHIPU_API_KEY) {
    try {
      return await searchWithZhipu(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] Zhipu search failed, trying fallback");
    }
  }

  // 4. 检查是否配置了 Google Custom Search API
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
    try {
      return await searchWithGoogle(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] Google search failed, trying fallback");
    }
  }

  // 5. 检查是否配置了 Exa API
  if (process.env.EXA_API_KEY) {
    try {
      return await searchWithExa(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] Exa search failed, trying fallback");
    }
  }

  // 6. 检查是否配置了 Tavily API
  if (process.env.TAVILY_API_KEY) {
    try {
      return await searchWithTavily(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] Tavily search failed, trying fallback");
    }
  }

  // 7. 检查是否配置了 SerpAPI
  if (process.env.SERPAPI_API_KEY) {
    try {
      return await searchWithSerpAPI(query, type, maxResults);
    } catch (_error) {
      console.warn("[Web Search] SerpAPI search failed");
    }
  }

  // 8. 无可用搜索 API，返回模拟结果（开发环境）
  if (process.env.NODE_ENV === "development") {
    return getMockSearchResults(query, type, maxResults);
  }

  throw new Error("No search API configured. Please set up a search provider.");
}

/**
 * 使用 Perplexity API 搜索
 */
async function searchWithPerplexity(
  query: string,
  _type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-sonar-small-128k-online",
      messages: [
        {
          role: "user",
          content: `搜索以下内容并返回前${maxResults}个相关结果：${query}`,
        },
      ],
      max_tokens: 1000,
      return_citations: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  // 解析 Perplexity 响应并转换为统一格式
  const citations = data.citations || [];
  return citations.slice(0, maxResults).map((citation: string, i: number) => ({
    title: `搜索结果 ${i + 1}`,
    url: citation,
    snippet: data.choices?.[0]?.message?.content?.substring(0, 200) || "",
    source: "Perplexity",
  }));
}

/**
 * 使用 Exa API 搜索
 */
async function searchWithExa(
  query: string,
  _type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EXA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      numResults: maxResults,
      useAutoprompt: true,
      type: "neural",
    }),
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map(
    (result: { title?: string; url?: string; text?: string }) => ({
      title: result.title || "",
      url: result.url || "",
      snippet: result.text?.substring(0, 300) || "",
      source: "Exa",
    })
  );
}

/**
 * 使用 Tavily API 搜索
 */
async function searchWithTavily(
  query: string,
  _type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: "advanced",
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || []).map(
    (result: { title?: string; url?: string; content?: string }) => ({
      title: result.title || "",
      url: result.url || "",
      snippet: result.content?.substring(0, 300) || "",
      source: "Tavily",
    })
  );
}

/**
 * 使用 SerpAPI 搜索
 */
async function searchWithSerpAPI(
  query: string,
  _type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    api_key: process.env.SERPAPI_API_KEY || "",
    engine: "google",
    num: String(maxResults),
    hl: "zh-CN",
    gl: "cn",
  });

  const response = await fetch(
    `https://serpapi.com/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }

  const data = await response.json();
  return (data.organic_results || []).map(
    (result: {
      title?: string;
      link?: string;
      snippet?: string;
      source?: string;
    }) => ({
      title: result.title || "",
      url: result.link || "",
      snippet: result.snippet || "",
      source: result.source || "SerpAPI",
    })
  );
}

/**
 * 使用 Bing Search API 搜索（国内可用）
 * 获取 API Key: https://www.microsoft.com/en-us/bing/apis/bing-web-search-api
 */
async function searchWithBing(
  query: string,
  _type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const endpoint = process.env.BING_SEARCH_ENDPOINT || "https://api.bing.microsoft.com/v7.0/search";

  const params = new URLSearchParams({
    q: query,
    count: String(maxResults),
    mkt: "zh-CN",
    setLang: "zh-Hans",
  });

  const response = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.BING_SEARCH_API_KEY || "",
    },
  });

  if (!response.ok) {
    throw new Error(`Bing API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.webPages?.value || []).map(
    (result: {
      name?: string;
      url?: string;
      snippet?: string;
      dateLastCrawled?: string;
    }) => ({
      title: result.name || "",
      url: result.url || "",
      snippet: result.snippet || "",
      source: "Bing",
      date: result.dateLastCrawled?.split("T")[0],
    })
  );
}

/**
 * 使用智谱 AI (GLM) 的 web_search 工具
 * 获取 API Key: https://open.bigmodel.cn/
 */
async function searchWithZhipu(
  query: string,
  type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "glm-4-alltools",
      messages: [
        {
          role: "user",
          content: `请搜索以下内容并返回前${maxResults}个最相关的结果，格式为JSON数组，每个结果包含title、url、snippet字段：${query}`,
        },
      ],
      tools: [
        {
          type: "web_search",
          web_search: {
            enable: true,
            search_query: query,
          },
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Zhipu API error: ${response.status}`);
  }

  const data = await response.json();

  // 解析智谱返回的 web_search 结果
  const webSearchResults = data.choices?.[0]?.message?.tool_calls?.find(
    (tc: { type: string }) => tc.type === "web_search"
  )?.web_search?.search_result;

  if (webSearchResults && Array.isArray(webSearchResults)) {
    return webSearchResults.slice(0, maxResults).map(
      (result: { title?: string; link?: string; content?: string }) => ({
        title: result.title || "",
        url: result.link || "",
        snippet: result.content?.substring(0, 300) || "",
        source: "智谱AI",
      })
    );
  }

  // 如果没有工具调用结果，尝试从文本中解析
  const content = data.choices?.[0]?.message?.content || "";
  return [
    {
      title: `${type} 搜索结果`,
      url: "",
      snippet: content.substring(0, 500),
      source: "智谱AI",
    },
  ];
}

/**
 * 使用 Google Custom Search API
 * 获取 API Key: https://developers.google.com/custom-search/v1/introduction
 * 获取 CX (Search Engine ID): https://programmablesearchengine.google.com/
 */
async function searchWithGoogle(
  query: string,
  _type: SearchType,
  maxResults: number
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    key: process.env.GOOGLE_SEARCH_API_KEY || "",
    cx: process.env.GOOGLE_SEARCH_CX || "",
    q: query,
    num: String(Math.min(maxResults, 10)), // Google API 最多返回 10 条
    lr: "lang_zh-CN",
    gl: "cn",
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.items || []).map(
    (result: {
      title?: string;
      link?: string;
      snippet?: string;
      displayLink?: string;
    }) => ({
      title: result.title || "",
      url: result.link || "",
      snippet: result.snippet || "",
      source: result.displayLink || "Google",
    })
  );
}

/**
 * 获取模拟搜索结果（开发环境）
 */
function getMockSearchResults(
  query: string,
  type: SearchType,
  maxResults: number
): SearchResult[] {
  const mockResults: Record<SearchType, SearchResult[]> = {
    news: [
      {
        title: "最高法发布典型案例：劳动争议纠纷处理新规",
        url: "https://example.com/news/1",
        snippet: "最高人民法院今日发布关于劳动争议纠纷处理的典型案例...",
        source: "法治日报",
        date: "2024-01-15",
      },
    ],
    regulation: [
      {
        title: "中华人民共和国民法典",
        url: "https://example.com/law/1",
        snippet:
          "《中华人民共和国民法典》已由中华人民共和国第十三届全国人民代表大会第三次会议于2020年5月28日通过...",
        source: "国家法律法规数据库",
      },
    ],
    case: [
      {
        title: "张某诉李某民间借贷纠纷案",
        url: "https://example.com/case/1",
        snippet: "案号：(2023)京01民终1234号。本案系民间借贷纠纷...",
        source: "裁判文书网",
        date: "2023-12-20",
      },
    ],
    general: [
      {
        title: `${query} - 相关法律信息`,
        url: "https://example.com/general/1",
        snippet: `关于"${query}"的法律相关信息...`,
        source: "法律百科",
      },
    ],
  };

  return mockResults[type].slice(0, maxResults);
}
