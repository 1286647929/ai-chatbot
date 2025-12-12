// 工具导出

export type { CaseResult } from "./case-search";
export { caseSearch } from "./case-search";
export type { RegulationResult } from "./regulation-search";
export { regulationSearch } from "./regulation-search";
// 类型导出
export type { SearchResult, SearchType } from "./web-search";
export { webSearch } from "./web-search";

import { caseSearch } from "./case-search";
import { regulationSearch } from "./regulation-search";
// 工具集合
import { webSearch } from "./web-search";

/**
 * 法律研究工具集
 */
export const legalResearchTools = {
  webSearch,
  regulationSearch,
};

/**
 * 案例分析工具集
 */
export const caseAnalysisTools = {
  webSearch,
  caseSearch,
};

/**
 * 文书起草工具集（待扩展）
 */
export const documentDraftTools = {
  regulationSearch,
  // 后续添加: documentGenerator, templateSearch
};

/**
 * 所有法律工具
 */
export const allLegalTools = {
  webSearch,
  regulationSearch,
  caseSearch,
};
