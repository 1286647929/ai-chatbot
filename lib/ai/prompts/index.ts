/**
 * 提示词模块 - 统一导出
 */

// 系统提示词
export {
  regularPrompt,
  ASSISTANT_NAME,
  baseIdentityConstraint,
  combineWithIdentity,
  type RequestHints,
  getRequestPromptFromHints,
} from "./system";

// 文档/Artifacts 提示词
export { artifactsPrompt, updateDocumentPrompt } from "./artifacts";

// 代码相关提示词
export { codePrompt, sheetPrompt } from "./code";

// 标题生成提示词
export { titlePrompt } from "./title";

// 法律相关提示词
export * from "./legal";

// 组合的系统提示词函数
import { regularPrompt, getRequestPromptFromHints, type RequestHints } from "./system";
import { artifactsPrompt } from "./artifacts";

/**
 * 根据请求上下文生成系统提示词
 */
export const systemPrompt = ({
  requestHints,
}: {
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);
  return `${regularPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
};
