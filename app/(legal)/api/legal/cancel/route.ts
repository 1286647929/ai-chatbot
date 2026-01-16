import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  session_id: z.string(),
  message_id: z.number().optional(),
});

function getBackendUrl(): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured");
  }
  return `${baseUrl}/app/legal/ai/message/cancel`;
}

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
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    clientid: clientId,
  };
}

export async function POST(request: Request) {
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const upstreamBody: Record<string, unknown> = {
      sessionUuid: body.session_id,
    };
    if (body.message_id !== undefined) {
      upstreamBody.messageId = body.message_id;
    }

    const response = await fetch(getBackendUrl(), {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify(upstreamBody),
      signal: request.signal,
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const msg = result?.msg || "Cancel failed";
      return NextResponse.json({ error: msg }, { status: response.status });
    }

    if (result?.code === 200) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: result?.msg || "Cancel failed" }, { status: 400 });
  } catch (error) {
    console.error("Legal cancel API error:", error);
    return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
  }
}
