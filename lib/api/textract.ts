/**
 * Textract 文字提取 API 模块
 */
import { get, upload } from "@/lib/request";
import type { TextractMultipleResponse } from "@/lib/legal/types";

/**
 * OSS 文件信息
 */
export interface OssFileInfo {
  ossId: string;
  url: string;
}

/**
 * 上传文件并提取文字
 * @param files 文件列表
 * @param scene 场景类型（legal/voice）
 */
export async function extractText(files: File[], scene: string = "legal") {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("scene", scene);

  return upload<TextractMultipleResponse>("/api/textract", formData, {
    errorMessage: "文件处理失败",
    timeout: 60000, // 文件上传超时时间延长到 60 秒
  });
}

/**
 * 上传语音并识别文字
 * @param audioBlob 音频 Blob
 * @param fileName 文件名
 */
export async function recognizeVoice(audioBlob: Blob, fileName?: string) {
  const file = new File(
    [audioBlob],
    fileName || `voice_${Date.now()}.webm`,
    { type: audioBlob.type }
  );

  return extractText([file], "voice");
}

/**
 * 获取 OSS 文件 URL
 * @param ossIds OSS 文件 ID 列表
 */
export async function getOssUrls(ossIds: string[]) {
  if (ossIds.length === 0) {
    return { success: true, data: [], status: 200 };
  }

  return get<OssFileInfo[]>("/api/textract/oss-info", {
    ossIds: ossIds.join(","),
  }, {
    showErrorToast: false, // OSS URL 获取失败不显示 toast
  });
}

/**
 * 获取 OSS 文件 URL（带重试）
 * @param ossIds OSS 文件 ID 列表
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 */
export async function getOssUrlsWithRetry(
  ossIds: string[],
  maxRetries: number = 3,
  retryDelay: number = 1500
): Promise<Map<string, string>> {
  if (ossIds.length === 0) return new Map();

  const urlMap = new Map<string, string>();
  let remainingIds = [...ossIds];

  for (let attempt = 0; attempt < maxRetries && remainingIds.length > 0; attempt++) {
    // 第一次之后等待一段时间再重试
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }

    const result = await getOssUrls(remainingIds);

    if (result.success && Array.isArray(result.data)) {
      for (const item of result.data) {
        if (item.ossId && item.url) {
          urlMap.set(String(item.ossId), item.url);
        }
      }

      // 过滤出还未获取到 URL 的 ID
      remainingIds = remainingIds.filter((id) => !urlMap.has(id));
    }
  }

  return urlMap;
}
