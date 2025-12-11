import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";
import { generateUUID } from "@/lib/utils";

// 支持的文件类型
const SUPPORTED_FILE_TYPES = [
  // 图片
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // 文档
  "application/pdf",
  // 音频
  "audio/webm",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
] as const;

// 最大文件大小 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size should be less than 10MB",
    })
    .refine((file) => SUPPORTED_FILE_TYPES.includes(file.type as any), {
      message: `File type should be one of: ${SUPPORTED_FILE_TYPES.join(", ")}`,
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get("file") as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      const fileId = generateUUID();
      const data = await put(`${fileId}-${filename}`, fileBuffer, {
        access: "public",
      });

      return NextResponse.json({
        ...data,
        fileId,
        contentType: file.type,
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
