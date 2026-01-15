import { NextResponse } from "next/server";
import { z } from "zod";

import type { LegalApiResponse, LegalInteractRequest } from "@/lib/legal/types";

// 请求验证 schema
const requestSchema = z.object({
  session_id: z.string().optional(),
  message: z.string().optional(),
  stream: z.boolean().optional().default(false),
  selected_path: z.string().optional(),
  attachments: z
    .array(
      z.object({
        attachment_id: z.string(),
        text_content: z.string().optional(),
      })
    )
    .optional(),
});

// 获取后端 API URL
function getBackendUrl(): string {
  const baseUrl = process.env.LEGAL_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("LEGAL_API_BASE_URL is not configured");
  }
  return `${baseUrl}/api/session/interact`;
}

// 构建请求头
function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const apiKey = process.env.LEGAL_API_KEY;
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

export async function POST(request: Request) {
  // 解析和验证请求体
  let requestBody: LegalInteractRequest;
  try {
    const json = await request.json();
    requestBody = requestSchema.parse(json);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  try {
    const backendUrl = getBackendUrl();
    const headers = buildHeaders();

    // 非流式请求
    if (!requestBody.stream) {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error:", errorText);

        return NextResponse.json(
          { error: "Backend service error" },
          { status: response.status }
        );
      }

      const rawData = await response.json();
      // 解包后端响应：后端返回 { code, data: { session_id, next_step, data }, message }
      // 前端期望 { session_id, next_step, data }
      const data: LegalApiResponse = rawData.data || rawData;
      return NextResponse.json(data);
    }

    // 流式请求 - 代理 SSE
    const response = await fetch(backendUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend stream error:", errorText);
      return NextResponse.json(
        { error: "Backend service error" },
        { status: response.status }
      );
    }

    // 检查响应是否为 SSE 流
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      // 如果不是 SSE，按普通 JSON 处理
      const rawData = await response.json();
      // 解包后端响应
      const data: LegalApiResponse = rawData.data || rawData;
      return NextResponse.json(data);
    }

    // 代理 SSE 流
    const stream = response.body;
    if (!stream) {
      return NextResponse.json(
        { error: "No response stream" },
        { status: 500 }
      );
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Legal API error:", error);
    return NextResponse.json(
      { error: "Failed to connect to backend service" },
      { status: 500 }
    );
  }
}
