/**
 * HTTP 请求方法
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * 请求配置选项
 */
export interface RequestOptions<TBody = unknown> {
  /** 请求方法，默认 GET */
  method?: HttpMethod;
  /** 请求体数据 */
  data?: TBody;
  /** URL 查询参数 */
  params?: Record<string, string | number | boolean | undefined>;
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 重试次数，默认 0（不重试） */
  retry?: number;
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 是否显示错误 toast，默认 true */
  showErrorToast?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 响应类型 */
  responseType?: "json" | "text" | "blob" | "arrayBuffer";
  /** AbortController 信号 */
  signal?: AbortSignal;
}

/**
 * 统一响应结构
 */
export interface ApiResponse<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 响应数据 */
  data: T;
  /** 错误消息 */
  message?: string;
  /** HTTP 状态码 */
  status: number;
}

/**
 * 请求错误
 */
export class RequestError extends Error {
  /** HTTP 状态码 */
  status: number;
  /** 原始响应 */
  response?: Response;
  /** 响应数据 */
  data?: unknown;

  constructor(
    message: string,
    status: number,
    response?: Response,
    data?: unknown
  ) {
    super(message);
    this.name = "RequestError";
    this.status = status;
    this.response = response;
    this.data = data;
  }
}

/**
 * 请求拦截器
 */
export type RequestInterceptor = (
  url: string,
  options: RequestInit
) =>
  | Promise<{ url: string; options: RequestInit }>
  | { url: string; options: RequestInit };

/**
 * 响应拦截器
 */
export type ResponseInterceptor<T = unknown> = (
  response: Response,
  data: T
) => Promise<T> | T;

/**
 * 错误拦截器
 */
export type ErrorInterceptor = (error: RequestError) => Promise<void> | void;

/**
 * 拦截器配置
 */
export interface Interceptors {
  request: RequestInterceptor[];
  response: ResponseInterceptor[];
  error: ErrorInterceptor[];
}
