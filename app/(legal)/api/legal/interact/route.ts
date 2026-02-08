import { NextResponse } from "next/server";
import { z } from "zod";

import type { LegalApiResponse, LegalInteractRequest } from "@/lib/legal/types";

// 请求验证 schema
const requestSchema = z.object({
  session_id: z.string().optional(),
  message: z.string().optional(),
  stream: z.boolean().optional().default(false),
  action: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  media_attachments: z
    .array(
      z.object({
        oss_id: z.number(),
        file_name: z.string().optional(),
        file_size: z.number().optional(),
        content_type: z.string().optional(),
        media_duration: z.number().int().optional(),
      })
    )
    .optional(),
});

function getBaseUrl(): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured");
  }
  return baseUrl;
}

function getAuthHeaders(): HeadersInit {
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

function buildJsonHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
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
    const baseUrl = getBaseUrl();
    const headers = buildJsonHeaders();

    // init：无 session_id 时创建会话并返回 greeting
    if (!requestBody.session_id) {
      const response = await fetch(`${baseUrl}/app/legal/ai/session/create`, {
        method: "POST",
        headers,
        signal: request.signal,
      });

      const raw = await safeReadJson(response);
      const payload = raw as { code?: number; msg?: string; data?: any } | null;
      if (!response.ok || !payload || payload.code !== 200 || !payload.data) {
        const msg = payload?.msg || "Failed to create session";
        return NextResponse.json(
          { error: msg },
          { status: response.status || 500 }
        );
      }

      const session = payload.data as {
        sessionUuid?: string;
        currentStep?: string;
        lastMessageText?: string;
      };

      const data: LegalApiResponse = {
        session_id: session.sessionUuid || "",
        next_step:
          (session.currentStep as LegalApiResponse["next_step"]) || "greeting",
        data: {
          message: session.lastMessageText || "",
        },
      };

      return NextResponse.json(data);
    }

    const upstreamBody = {
      session_id: requestBody.session_id,
      message: requestBody.message,
      action: requestBody.action,
      data: requestBody.data,
      stream: Boolean(requestBody.stream),
      media_attachments: requestBody.media_attachments,
    };

    // 非流式请求
    if (!requestBody.stream) {
      const response = await fetch(`${baseUrl}/app/legal/ai/message/send`, {
        method: "POST",
        headers,
        body: JSON.stringify(upstreamBody),
        signal: request.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("RuoYi backend error:", errorText);

        return NextResponse.json(
          { error: "Backend service error" },
          { status: response.status }
        );
      }

      const raw = await safeReadJson(response);
      const payload = raw as { code?: number; msg?: string; data?: any } | null;
      if (!payload || payload.code !== 200 || !payload.data) {
        const msg = payload?.msg || "Backend service error";
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      const result = payload.data as {
        sessionId?: string;
        nextStep?: string;
        data?: Record<string, unknown> | null;
        message?: string | null;
      };

      const responseData: Record<string, unknown> =
        (result.data && typeof result.data === "object" ? result.data : {}) ??
        {};
      if (!("message" in responseData) && result.message) {
        responseData.message = result.message;
      }

      const data: LegalApiResponse = {
        session_id: result.sessionId || requestBody.session_id || "",
        next_step: result.nextStep as LegalApiResponse["next_step"],
        data: responseData,
      };

      return NextResponse.json(data);
    }

    // 流式请求 - 代理 SSE
    const response = await fetch(
      `${baseUrl}/app/legal/ai/message/send_stream`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(upstreamBody),
        signal: request.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RuoYi backend stream error:", errorText);
      return NextResponse.json(
        { error: "Backend service error" },
        { status: response.status }
      );
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
      status: response.status,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
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
