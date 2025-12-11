import { toast } from "sonner";

import type {
  ApiResponse,
  ErrorInterceptor,
  HttpMethod,
  Interceptors,
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from "./types";
import { RequestError } from "./types";

// ============================================================
// 默认配置
// ============================================================
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_DELAY = 1000;

// ============================================================
// 拦截器管理
// ============================================================
const interceptors: Interceptors = {
  request: [],
  response: [],
  error: [],
};

/**
 * 添加请求拦截器
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): () => void {
  interceptors.request.push(interceptor);
  return () => {
    const index = interceptors.request.indexOf(interceptor);
    if (index > -1) {
      interceptors.request.splice(index, 1);
    }
  };
}

/**
 * 添加响应拦截器
 */
export function addResponseInterceptor<T = unknown>(
  interceptor: ResponseInterceptor<T>
): () => void {
  interceptors.response.push(interceptor as ResponseInterceptor);
  return () => {
    const index = interceptors.response.indexOf(interceptor as ResponseInterceptor);
    if (index > -1) {
      interceptors.response.splice(index, 1);
    }
  };
}

/**
 * 添加错误拦截器
 */
export function addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
  interceptors.error.push(interceptor);
  return () => {
    const index = interceptors.error.indexOf(interceptor);
    if (index > -1) {
      interceptors.error.splice(index, 1);
    }
  };
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 构建带查询参数的 URL
 */
function buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return url;

  return url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
}

/**
 * 创建超时 Promise
 */
function createTimeoutPromise(timeout: number, controller: AbortController): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new RequestError("请求超时", 0));
    }, timeout);
  });
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 获取错误消息
 */
function getErrorMessage(status: number, data: unknown): string {
  // 优先使用响应中的错误消息
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.msg === "string") return obj.msg;
  }

  // 根据状态码返回默认消息
  switch (status) {
    case 400:
      return "请求参数错误";
    case 401:
      return "未授权，请登录";
    case 403:
      return "拒绝访问";
    case 404:
      return "请求的资源不存在";
    case 408:
      return "请求超时";
    case 500:
      return "服务器内部错误";
    case 502:
      return "网关错误";
    case 503:
      return "服务不可用";
    case 504:
      return "网关超时";
    default:
      return `请求失败 (${status})`;
  }
}

// ============================================================
// 核心请求函数
// ============================================================

/**
 * 执行单次请求
 */
async function executeRequest<TResponse, TBody = unknown>(
  url: string,
  options: RequestOptions<TBody>
): Promise<ApiResponse<TResponse>> {
  const {
    method = "GET",
    data,
    params,
    headers = {},
    timeout = DEFAULT_TIMEOUT,
    responseType = "json",
    signal,
  } = options;

  // 构建完整 URL
  const fullUrl = buildUrl(url, params);

  // 准备请求选项
  let fetchOptions: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    signal,
  };

  // 处理请求体
  if (data !== undefined) {
    if (data instanceof FormData) {
      // FormData 不需要设置 Content-Type，浏览器会自动处理
      fetchOptions.body = data;
    } else {
      (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(data);
    }
  }

  // 执行请求拦截器
  let processedUrl = fullUrl;
  for (const interceptor of interceptors.request) {
    const result = await interceptor(processedUrl, fetchOptions);
    processedUrl = result.url;
    fetchOptions = result.options;
  }

  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  if (!fetchOptions.signal) {
    fetchOptions.signal = controller.signal;
  }

  // 执行请求（带超时）
  const response = await Promise.race([
    fetch(processedUrl, fetchOptions),
    createTimeoutPromise(timeout, controller),
  ]);

  // 解析响应
  let responseData: TResponse;
  try {
    switch (responseType) {
      case "text":
        responseData = (await response.text()) as TResponse;
        break;
      case "blob":
        responseData = (await response.blob()) as TResponse;
        break;
      case "arrayBuffer":
        responseData = (await response.arrayBuffer()) as TResponse;
        break;
      default:
        responseData = (await response.json()) as TResponse;
    }
  } catch {
    // 解析失败时返回空对象
    responseData = {} as TResponse;
  }

  // 检查响应状态
  if (!response.ok) {
    const error = new RequestError(
      getErrorMessage(response.status, responseData),
      response.status,
      response,
      responseData
    );
    throw error;
  }

  // 执行响应拦截器
  let processedData = responseData;
  for (const interceptor of interceptors.response) {
    processedData = await interceptor(response, processedData);
  }

  return {
    success: true,
    data: processedData as TResponse,
    status: response.status,
  };
}

/**
 * 核心请求函数（带重试）
 */
export async function request<TResponse = unknown, TBody = unknown>(
  url: string,
  options: RequestOptions<TBody> = {}
): Promise<ApiResponse<TResponse>> {
  const {
    retry = 0,
    retryDelay = DEFAULT_RETRY_DELAY,
    showErrorToast = true,
    errorMessage,
  } = options;

  let lastError: RequestError | null = null;

  // 执行请求（带重试）
  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      // 重试时等待
      if (attempt > 0) {
        await delay(retryDelay);
      }

      return await executeRequest<TResponse, TBody>(url, options);
    } catch (error) {
      if (error instanceof RequestError) {
        lastError = error;

        // 某些错误不应该重试
        if ([400, 401, 403, 404].includes(error.status)) {
          break;
        }
      } else {
        lastError = new RequestError(
          error instanceof Error ? error.message : "未知错误",
          0
        );
      }
    }
  }

  // 所有重试都失败了
  if (lastError) {
    // 执行错误拦截器
    for (const interceptor of interceptors.error) {
      await interceptor(lastError);
    }

    // 显示错误 toast
    if (showErrorToast) {
      toast.error(errorMessage || lastError.message);
    }
  }

  return {
    success: false,
    data: lastError?.data as TResponse,
    message: lastError?.message || "请求失败",
    status: lastError?.status || 0,
  };
}

// ============================================================
// 便捷方法
// ============================================================

/**
 * GET 请求
 */
export function get<TResponse = unknown>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: Omit<RequestOptions, "method" | "data" | "params">
): Promise<ApiResponse<TResponse>> {
  return request<TResponse>(url, { ...options, method: "GET", params });
}

/**
 * POST 请求
 */
export function post<TResponse = unknown, TBody = unknown>(
  url: string,
  data?: TBody,
  options?: Omit<RequestOptions<TBody>, "method" | "data">
): Promise<ApiResponse<TResponse>> {
  return request<TResponse, TBody>(url, { ...options, method: "POST", data });
}

/**
 * PUT 请求
 */
export function put<TResponse = unknown, TBody = unknown>(
  url: string,
  data?: TBody,
  options?: Omit<RequestOptions<TBody>, "method" | "data">
): Promise<ApiResponse<TResponse>> {
  return request<TResponse, TBody>(url, { ...options, method: "PUT", data });
}

/**
 * PATCH 请求
 */
export function patch<TResponse = unknown, TBody = unknown>(
  url: string,
  data?: TBody,
  options?: Omit<RequestOptions<TBody>, "method" | "data">
): Promise<ApiResponse<TResponse>> {
  return request<TResponse, TBody>(url, { ...options, method: "PATCH", data });
}

/**
 * DELETE 请求
 */
export function del<TResponse = unknown>(
  url: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: Omit<RequestOptions, "method" | "data" | "params">
): Promise<ApiResponse<TResponse>> {
  return request<TResponse>(url, { ...options, method: "DELETE", params });
}

/**
 * 上传文件
 */
export function upload<TResponse = unknown>(
  url: string,
  formData: FormData,
  options?: Omit<RequestOptions<FormData>, "method" | "data">
): Promise<ApiResponse<TResponse>> {
  return request<TResponse, FormData>(url, {
    ...options,
    method: "POST",
    data: formData,
  });
}

// ============================================================
// 导出类型
// ============================================================
export { RequestError } from "./types";
export type {
  ApiResponse,
  ErrorInterceptor,
  HttpMethod,
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from "./types";
