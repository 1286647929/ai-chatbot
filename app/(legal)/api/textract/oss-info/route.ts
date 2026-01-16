import { NextResponse } from "next/server";

// 获取后端 API URL
function getBackendUrl(): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured");
  }
  return `${baseUrl}/app/legal/textract/oss-info`;
}

// 构建请求头
function buildHeaders(): HeadersInit {
  const token = process.env.BEARER_TOKEN;
  const clientId = process.env.CLIENTID;
  if (!token) {
    throw new Error("BEARER_TOKEN is not configured");
  }
  if (!clientId) {
    throw new Error("CLIENTID is not configured");
  }
  return {
    Authorization: `Bearer ${token}`,
    clientid: clientId,
  };
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
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const backendUrl = `${getBackendUrl()}?ossIds=${encodeURIComponent(ossIds)}`;
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: buildHeaders(),
      signal: request.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OSS info backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to get OSS info" },
        { status: response.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await response.json();

    // 后端返回格式: { code: 200, data: [...], msg: "..." }
    if (result.code === 200 && result.data) {
      return NextResponse.json(result.data, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json(result.data || [], {
      headers: { "Cache-Control": "no-store" },
    });
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
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
