// 工具导出

export type { CaseResult } from "./case-search";
export { caseSearch } from "./case-search";
// 文书生成工具导出
export {
  documentGeneratorTools,
  generateDocument,
  getDocumentTemplateInfo,
  listDocumentTemplates,
} from "./document-generator";
export type { DocumentGenerateResult } from "./document-generator";
export type { RegulationResult } from "./regulation-search";
export { regulationSearch } from "./regulation-search";
// 类型导出
export type { SearchResult, SearchType } from "./web-search";
export { webSearch } from "./web-search";
// Handover 工具导出
export {
  createHandoverTool,
  getAgentInfo,
  getAvailableTargets,
  handover,
} from "../handover";
export type { HandoverRequest, HandoverResult } from "../handover";

import { AgentType } from "../../agents/types";
import { createHandoverTool } from "../handover";
import { caseSearch } from "./case-search";
import {
  generateDocument,
  getDocumentTemplateInfo,
  listDocumentTemplates,
} from "./document-generator";
import { regulationSearch } from "./regulation-search";
// 工具集合
import { webSearch } from "./web-search";

/**
 * 法律研究工具集
 */
export const legalResearchTools = {
  webSearch,
  regulationSearch,
  handover: createHandoverTool(AgentType.LEGAL_RESEARCH),
};

/**
 * 案例分析工具集
 */
export const caseAnalysisTools = {
  webSearch,
  caseSearch,
  handover: createHandoverTool(AgentType.CASE_ANALYSIS),
};

/**
 * 文书起草工具集
 */
export const documentDraftTools = {
  regulationSearch,
  listDocumentTemplates,
  getDocumentTemplateInfo,
  generateDocument,
  handover: createHandoverTool(AgentType.DOCUMENT_DRAFT),
};

/**
 * 法律顾问工具集
 */
export const legalAdvisorTools = {
  webSearch,
  regulationSearch,
  caseSearch,
  handover: createHandoverTool(AgentType.LEGAL_ADVISOR),
};

/**
 * 所有法律工具
 */
export const allLegalTools = {
  webSearch,
  regulationSearch,
  caseSearch,
  listDocumentTemplates,
  getDocumentTemplateInfo,
  generateDocument,
};
