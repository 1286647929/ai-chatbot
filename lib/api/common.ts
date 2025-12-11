/**
 * 通用 API 模块
 * 导出常用的 API（历史记录、投票等）
 */
import { del, patch, post } from "@/lib/request";

/**
 * 删除所有聊天历史（返回 Promise，适用于 toast.promise）
 */
export function deleteAllHistoryAsync(): Promise<void> {
  return del("/api/history").then((result) => {
    if (!result.success) {
      throw new Error(result.message || "删除历史记录失败");
    }
  });
}

/**
 * 删除单个聊天（返回 Promise，适用于 toast.promise）
 * @param chatId 聊天 ID
 */
export function deleteChatAsync(chatId: string): Promise<void> {
  return del(`/api/chat`, { id: chatId }, { showErrorToast: false }).then((result) => {
    if (!result.success) {
      throw new Error(result.message || "删除聊天失败");
    }
  });
}

/**
 * 投票请求数据
 */
interface VoteRequest {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}

/**
 * 消息投票（返回 Promise，适用于 toast.promise）
 * @param data 投票数据
 */
export function voteAsync(data: VoteRequest): Promise<void> {
  return patch("/api/vote", data, { showErrorToast: false }).then((result) => {
    if (!result.success) {
      throw new Error(result.message || "投票失败");
    }
  });
}

/**
 * 删除所有聊天历史
 */
export async function deleteAllHistory() {
  return del("/api/history", undefined, {
    errorMessage: "删除历史记录失败",
  });
}

/**
 * 删除单个聊天
 * @param chatId 聊天 ID
 */
export async function deleteChat(chatId: string) {
  return del(`/api/chat`, { id: chatId }, {
    errorMessage: "删除聊天失败",
  });
}

/**
 * 消息投票
 * @param data 投票数据
 */
export async function vote(data: VoteRequest) {
  return patch("/api/vote", data, {
    showErrorToast: false,
  });
}

/**
 * 上传文件
 * @param file 文件
 */
export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return post<{ url: string; pathname: string; contentType: string }>(
    "/api/files/upload",
    formData as unknown as Record<string, unknown>,
    {
      errorMessage: "文件上传失败",
      timeout: 60000,
    }
  );
}

/**
 * 更新文档
 * @param documentId 文档 ID
 * @param content 文档内容
 * @param title 文档标题
 */
export async function updateDocument(
  documentId: string,
  content: string,
  title: string
) {
  return post(`/api/document?id=${documentId}`, { content, title }, {
    errorMessage: "保存文档失败",
  });
}
