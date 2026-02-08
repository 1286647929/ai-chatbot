import { NextResponse } from "next/server";

import type { TextractMultipleResponse } from "@/lib/legal/types";

// 获取后端 API URL
function getBackendUrl(): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured");
  }
  return `${baseUrl}/app/legal/textract/multiple`;
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

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 支持 multipart/form-data 文件上传
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const files = formData.getAll("files") as File[];
      const scene = formData.get("scene") as string | null;

      if (files.length === 0) {
        return NextResponse.json(
          { error: "No files provided" },
          { status: 400 }
        );
      }

      // 构建发送到后端的 FormData
      const backendFormData = new FormData();
      for (const file of files) {
        backendFormData.append("files", file, file.name);
      }
      if (scene) {
        backendFormData.append("scene", scene);
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: buildHeaders(),
        body: backendFormData,
        signal: request.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Textract backend error:", errorText);
        return NextResponse.json(
          { error: "Text extraction failed" },
          { status: response.status }
        );
      }

      const result = await response.json();

      // 后端返回格式: { code: 200, data: { results: [...], status, total, success, failed }, msg: "..." }
      if (result.code === 200 && result.data) {
        const textractResult: TextractMultipleResponse = {
          results: result.data.results || [],
          status: result.data.status || "success",
          total: result.data.total || 0,
          success: result.data.success || 0,
          failed: result.data.failed || 0,
        };
        return NextResponse.json(textractResult);
      }

      // 直接返回 data（兼容其他格式）
      return NextResponse.json(result.data || result);
    }

    // 不支持的内容类型
    return NextResponse.json(
      {
        error:
          "Unsupported content type. Use multipart/form-data for file upload.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Textract API error:", error);
    return NextResponse.json(
      { error: "Failed to extract text from file" },
      { status: 500 }
    );
  }
}
