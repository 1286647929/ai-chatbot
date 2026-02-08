/**
 * API 模块统一导出
 *
 * 使用示例:
 * ```ts
 * import { textractApi, request } from "@/lib/api";
 *
 * // 使用通用请求
 * const data = await request.get("/api/xxx");
 * ```
 */

export type {
  ApiResponse,
  ErrorInterceptor,
  HttpMethod,
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from "@/lib/request";
// 导出请求工具
export {
  addErrorInterceptor,
  addRequestInterceptor,
  addResponseInterceptor,
  del,
  get,
  patch,
  post,
  put,
  RequestError,
  request,
  upload,
} from "@/lib/request";

// 导出 API 模块
export * as textractApi from "./textract";

export {
  extractText,
  getOssUrls,
  getOssUrlsWithRetry,
  recognizeVoice,
} from "./textract";
