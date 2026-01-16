/**
 * 法律咨询 API 模块
 */
import { post } from "@/lib/request";
import type { LegalApiResponse, LegalInteractRequest, LegalMediaAttachment } from "@/lib/legal/types";

/**
 * 法律咨询交互 API
 * @param data 请求数据
 * @param options 额外配置
 */
export async function legalInteract(
  data: LegalInteractRequest,
  options?: {
    showErrorToast?: boolean;
    errorMessage?: string;
  }
) {
  return post<LegalApiResponse, LegalInteractRequest>("/api/legal/interact", data, {
    showErrorToast: options?.showErrorToast ?? true,
    errorMessage: options?.errorMessage ?? "法律咨询服务暂时不可用",
  });
}

/**
 * 初始化法律咨询会话
 */
export async function initLegalSession() {
  return legalInteract({}, {
    errorMessage: "初始化会话失败",
  });
}

/**
 * 发送法律咨询消息
 * @param sessionId 会话ID
 * @param message 消息内容
 * @param attachments 附件列表
 */
export async function sendLegalMessage(
  sessionId: string,
  message: string,
  mediaAttachments?: LegalMediaAttachment[]
) {
  return legalInteract({
    session_id: sessionId,
    message,
    action: "continue",
    media_attachments: mediaAttachments,
  });
}

/**
 * 选择文书路径
 * @param sessionId 会话ID
 * @param pathId 路径ID
 */
export async function selectLegalPath(sessionId: string, pathId: string) {
  return legalInteract({
    session_id: sessionId,
    message: pathId,
    action: "continue",
  });
}

/**
 * 自动继续（路径选择后）
 * @param sessionId 会话ID
 */
export async function continueLegalSession(sessionId: string) {
  return legalInteract({
    session_id: sessionId,
    action: "continue",
  });
}
