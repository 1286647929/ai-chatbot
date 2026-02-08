import {
  FileTextIcon,
  FileIcon as LucideFileIcon,
  MicIcon,
  Music2Icon,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Loader } from "./elements/loader";
import { CrossSmallIcon } from "./icons";
import { Button } from "./ui/button";

export type PreviewAttachmentData = {
  url: string;
  name?: string;
  contentType?: string;
};

interface PreviewAttachmentProps {
  attachment: PreviewAttachmentData;
  isUploading?: boolean;
  isExtracting?: boolean;
  extractionError?: string;
  onRemove?: () => void;
}

/**
 * 根据 contentType 获取对应的图标组件
 */
function getFileIcon(contentType: string, name?: string) {
  // 音频文件
  if (contentType?.startsWith("audio/")) {
    return <MicIcon className="size-6 text-purple-500" />;
  }

  // PDF 文件
  if (contentType === "application/pdf") {
    return <FileTextIcon className="size-6 text-red-500" />;
  }

  // Word 文档
  if (
    contentType === "application/msword" ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return <FileTextIcon className="size-6 text-blue-500" />;
  }

  // 文本文件
  if (contentType?.startsWith("text/")) {
    return <FileTextIcon className="size-6 text-gray-500" />;
  }

  // 音乐/视频文件（扩展名判断）
  const ext = name?.split(".").pop()?.toLowerCase();
  if (ext && ["mp3", "wav", "ogg", "m4a", "aac", "webm"].includes(ext)) {
    return <Music2Icon className="size-6 text-purple-500" />;
  }

  // 默认文件图标
  return <LucideFileIcon className="size-6 text-muted-foreground" />;
}

/**
 * 格式化文件名显示
 */
function formatFileName(name?: string): string {
  if (!name) {
    return "File";
  }
  // 如果文件名太长，截断中间部分
  if (name.length > 15) {
    const ext = name.split(".").pop();
    const baseName = name.slice(0, name.lastIndexOf("."));
    if (baseName.length > 10) {
      return `${baseName.slice(0, 6)}...${ext ? `.${ext}` : ""}`;
    }
  }
  return name;
}

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  isExtracting = false,
  extractionError,
  onRemove,
}: PreviewAttachmentProps) => {
  const { name, url, contentType } = attachment;

  // 判断是否是图片
  const isImage = contentType?.startsWith("image");
  // 判断是否是音频
  const isAudio =
    contentType?.startsWith("audio/") ||
    (name &&
      ["mp3", "wav", "ogg", "m4a", "aac", "webm"].includes(
        name.split(".").pop()?.toLowerCase() || ""
      ));

  return (
    <div
      className={cn(
        "group relative size-16 overflow-hidden rounded-lg border bg-muted",
        extractionError && "border-red-500/50"
      )}
      data-testid="input-attachment-preview"
    >
      {isImage ? (
        <Image
          alt={name ?? "An image attachment"}
          className="size-full object-cover"
          height={64}
          src={url}
          width={64}
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-1">
          {getFileIcon(contentType || "", name)}
          {isAudio && (
            <span className="text-[8px] text-muted-foreground">语音</span>
          )}
        </div>
      )}

      {/* 上传中状态 */}
      {isUploading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          data-testid="input-attachment-loader"
        >
          <Loader size={16} />
        </div>
      )}

      {/* OCR 提取中状态 */}
      {isExtracting && !isUploading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/50"
          data-testid="ocr-extracting-indicator"
        >
          <Loader size={14} />
          <span className="mt-1 text-[8px] text-white">识别中</span>
        </div>
      )}

      {/* OCR 提取错误状态 */}
      {extractionError && !isUploading && !isExtracting && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-red-500/20"
          data-testid="ocr-error-indicator"
          title={extractionError}
        >
          <span className="text-[10px] text-red-500">识别失败</span>
        </div>
      )}

      {/* 删除按钮 */}
      {onRemove && !isUploading && (
        <Button
          className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onRemove}
          size="sm"
          variant="destructive"
        >
          <CrossSmallIcon size={8} />
        </Button>
      )}

      {/* 文件名 */}
      <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-white">
        {formatFileName(name)}
      </div>
    </div>
  );
};
