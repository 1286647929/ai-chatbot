/**
 * 提示词模块 - 统一导出
 */

// 系统提示词
export {
  regularPrompt,
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
 * 根据模型类型和请求上下文生成系统提示词
 */
export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string;
  requestHints: RequestHints;
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints);

  if (selectedChatModel === "chat-model-reasoning") {
    return `${regularPrompt}\n\n${requestPrompt}`;
  }

  return `${regularPrompt}\n\n${requestPrompt}\n\n${artifactsPrompt}`;
};
