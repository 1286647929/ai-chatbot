/**
 * API 模块统一导出
 *
 * 使用示例:
 * ```ts
 * import { legalApi, textractApi, request } from "@/lib/api";
 *
 * // 使用封装的 API
 * const result = await legalApi.sendMessage(sessionId, message);
 *
 * // 使用通用请求
 * const data = await request.get("/api/xxx");
 * ```
 */

// 导出请求工具
export {
  request,
  get,
  post,
  put,
  patch,
  del,
  upload,
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
  RequestError,
} from "@/lib/request";

export type {
  ApiResponse,
  RequestOptions,
  HttpMethod,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "@/lib/request";

// 导出 API 模块
export * as legalApi from "./legal";
export * as textractApi from "./textract";
export * as commonApi from "./common";

// 也可以直接导出具体方法（按需使用）
export {
  legalInteract,
  initLegalSession,
  sendLegalMessage,
  selectLegalPath,
  continueLegalSession,
} from "./legal";

export {
  extractText,
  recognizeVoice,
  getOssUrls,
  getOssUrlsWithRetry,
} from "./textract";

export {
  deleteAllHistory,
  deleteAllHistoryAsync,
  deleteChat,
  deleteChatAsync,
  vote,
  voteAsync,
  uploadFile,
  updateDocument,
} from "./common";
