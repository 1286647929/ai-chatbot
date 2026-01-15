import { NextResponse } from "next/server";

// 获取后端 API URL
function getBackendUrl(): string {
  const baseUrl = process.env.TEXTRACT_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("TEXTRACT_API_BASE_URL is not configured");
  }
  return `${baseUrl}/app/legal/textract/oss-info`;
}

// 构建请求头
function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {};

  const apiKey = process.env.TEXTRACT_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

// OSS 文件信息类型
export interface OssInfo {
  ossId: string;
  url: string;
  fileName: string;
  originalName: string;
  fileSuffix: string;
  contentType: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ossIds = searchParams.get("ossIds");

    if (!ossIds) {
      return NextResponse.json(
        { error: "ossIds parameter is required" },
        { status: 400 }
      );
    }

    const backendUrl = `${getBackendUrl()}?ossIds=${encodeURIComponent(ossIds)}`;
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OSS info backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to get OSS info" },
        { status: response.status }
      );
    }

    const result = await response.json();

    // 后端返回格式: { code: 200, data: [...], msg: "..." }
    if (result.code === 200 && result.data) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json(result.data || []);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest?: unknown }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }
    console.error("OSS info API error:", error);
    return NextResponse.json(
      { error: "Failed to get OSS info" },
      { status: 500 }
    );
  }
}
