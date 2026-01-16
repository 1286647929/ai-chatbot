import { NextResponse } from "next/server";

function getBackendUrl(): string {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error("BASE_URL is not configured");
  }
  return `${baseUrl}/app/legal/upload/files`;
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
    Authorization: `Bearer ${token}`,
    clientid: clientId,
  };
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Unsupported content type. Use multipart/form-data for file upload." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const backendFormData = new FormData();
    for (const file of files) {
      backendFormData.append("files", file, file.name);
    }

    const response = await fetch(getBackendUrl(), {
      method: "POST",
      headers: buildHeaders(),
      body: backendFormData,
      signal: request.signal,
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      result = null;
    }

    if (!response.ok) {
      const msg = result?.msg || "Upload failed";
      return NextResponse.json({ error: msg }, { status: response.status });
    }

    if (result?.code === 200 && result.data) {
      return NextResponse.json(result.data);
    }

    return NextResponse.json({ error: result?.msg || "Upload failed" }, { status: 400 });
  } catch (error) {
    console.error("Legal upload API error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
