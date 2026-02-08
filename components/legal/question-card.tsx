"use client";

import { FileTextIcon, PaperclipIcon } from "lucide-react";

import type { QuestionMeta } from "@/lib/legal/types";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Progress } from "../ui/progress";

interface QuestionCardProps {
  question: QuestionMeta;
}

export function QuestionCard({ question }: QuestionCardProps) {
  const progressPercent = question.progress
    ? (question.progress.current / question.progress.total) * 100
    : 0;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FileTextIcon className="size-4" />
            <span>
              问题 {question.progress?.current} / {question.progress?.total}
            </span>
          </div>
          {question.progress && (
            <div className="w-24">
              <Progress className="h-2" value={progressPercent} />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* 问题文本 */}
        <div className="font-medium text-foreground">{question.question}</div>

        {/* 事实分析（如果有） */}
        {question.fact_analysis && (
          <div className="rounded-lg bg-muted/50 p-3 text-muted-foreground text-sm">
            <div className="mb-1 font-medium text-foreground/80">
              背景分析：
            </div>
            {question.fact_analysis}
          </div>
        )}

        {/* 附件提示（如果有） */}
        {question.attachment_hint && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <PaperclipIcon className="mt-0.5 size-4 shrink-0" />
            <span>{question.attachment_hint}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
