"use client";

import { AlertTriangleIcon, FileCheckIcon, FileTextIcon } from "lucide-react";

import type { AttachmentAnalysis } from "@/lib/legal/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "../ui/card";

interface AttachmentAnalysisCardProps {
  analysis: AttachmentAnalysis;
}

export function AttachmentAnalysisCard({
  analysis,
}: AttachmentAnalysisCardProps) {
  const isDuplicate = analysis.is_duplicate;

  return (
    <Card
      className={cn("overflow-hidden", {
        "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20":
          isDuplicate,
        "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20":
          !isDuplicate,
      })}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* 图标 */}
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              {
                "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400":
                  isDuplicate,
                "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400":
                  !isDuplicate,
              }
            )}
          >
            {isDuplicate ? (
              <AlertTriangleIcon className="size-4" />
            ) : (
              <FileCheckIcon className="size-4" />
            )}
          </div>

          {/* 内容 */}
          <div className="min-w-0 flex-1">
            {/* 类型识别 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{analysis.type_name}</span>
              {analysis.confidence !== undefined && (
                <span className="text-muted-foreground text-xs">
                  置信度: {Math.round(analysis.confidence * 100)}%
                </span>
              )}
            </div>

            {/* 摘要 */}
            {analysis.summary && (
              <p className="mt-1 text-muted-foreground text-sm line-clamp-2">
                {analysis.summary}
              </p>
            )}

            {/* 重复警告 */}
            {isDuplicate && analysis.duplicate_message && (
              <div className="mt-2 flex items-start gap-2 text-amber-700 text-sm dark:text-amber-300">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                <span>{analysis.duplicate_message}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 多个附件分析列表
interface AttachmentAnalysisListProps {
  analyses: AttachmentAnalysis[];
}

export function AttachmentAnalysisList({
  analyses,
}: AttachmentAnalysisListProps) {
  if (!analyses || analyses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <FileTextIcon className="size-4" />
        <span>附件分析结果</span>
      </div>
      <div className="space-y-2">
        {analyses.map((analysis) => (
          <AttachmentAnalysisCard
            analysis={analysis}
            key={analysis.attachment_id}
          />
        ))}
      </div>
    </div>
  );
}
