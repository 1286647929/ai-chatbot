"use client";

/**
 * 法律文书助手 - 各阶段专属渲染组件
 * 根据 next_step 提供差异化的 UI 渲染
 */

import { useState } from "react";

import type {
  ConsultationProgress,
  DocumentPath,
  FactAnalysis,
  QuestionMeta,
  QuestionProgress,
  RecommendedPath,
  SupplementField,
} from "@/lib/legal/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

// ============================================================
// 案由信息卡片 (select_document_path 阶段)
// ============================================================
interface CaseInfoCardProps {
  caseType: string;
  confidence: number;
}

export function CaseInfoCard({ caseType, confidence }: CaseInfoCardProps) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidencePercent >= 80
      ? "text-green-600"
      : confidencePercent >= 60
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/30">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-blue-800 text-sm dark:text-blue-200">
            案由识别结果
          </div>
          <div className="mt-1 font-semibold text-blue-900 text-lg dark:text-blue-100">
            {caseType}
          </div>
        </div>
        <div className="text-right">
          <div className="text-muted-foreground text-xs">置信度</div>
          <div className={cn("font-bold text-xl", confidenceColor)}>
            {confidencePercent}%
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 文书路径选择器 (select_document_path 阶段)
// ============================================================
interface DocumentPathSelectorProps {
  paths: DocumentPath[];
  recommendedPath?: RecommendedPath | null;
  isLoading?: boolean;
  onSelect: (path: DocumentPath) => void;
}

export function DocumentPathSelector({
  paths,
  recommendedPath,
  isLoading,
  onSelect,
}: DocumentPathSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="font-medium text-sm">请选择文书类型：</div>
      <div className="grid gap-3">
        {paths.map((path) => {
          // 兼容 id/path_id 和 name/path_name 两种字段名
          const pathId = path.id || path.path_id || "";
          const pathName = path.name || path.path_name || "";
          const isRecommended = recommendedPath?.id === pathId;
          return (
            <button
              className={cn(
                "group relative w-full rounded-lg border p-4 text-left transition-all hover:border-primary hover:shadow-md",
                isRecommended && "border-primary bg-primary/5",
                isLoading && "pointer-events-none opacity-50"
              )}
              disabled={isLoading}
              key={pathId}
              onClick={() => onSelect(path)}
              type="button"
            >
              {isRecommended && (
                <span className="-top-2 absolute right-2 rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
                  推荐
                </span>
              )}
              <div className="font-medium">{pathName}</div>
              <div className="mt-1 text-muted-foreground text-sm">
                {path.description}
              </div>
              {isRecommended && recommendedPath?.reason && (
                <div className="mt-2 border-primary/20 border-t pt-2 text-primary text-xs">
                  {recommendedPath.reason}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// 咨询进度指示器 (consulting 阶段)
// ============================================================
interface ConsultationProgressProps {
  progress: ConsultationProgress;
  needMoreInfo?: boolean;
  canProceed?: boolean;
}

export function ConsultationProgressIndicator({
  progress,
  needMoreInfo,
  canProceed,
}: ConsultationProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">咨询进度</span>
        <span className="font-medium">
          {progress.consultation_count} / {progress.max_consultations}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${(progress.consultation_count / progress.max_consultations) * 100}%`,
          }}
        />
      </div>
      {needMoreInfo && (
        <div className="text-muted-foreground text-xs">
          请补充更多信息以便更好地分析您的情况
        </div>
      )}
      {canProceed && (
        <div className="text-green-600 text-xs">
          信息已充分，可以继续进入下一步
        </div>
      )}
    </div>
  );
}

// ============================================================
// 问题卡片 (ask_question 阶段)
// ============================================================
interface QuestionCardProps {
  question: QuestionMeta;
  progress?: QuestionProgress | null;
  requireAttachment?: boolean;
  attachmentHint?: string | null;
  factAnalysis?: FactAnalysis | null;
}

export function QuestionCard({
  question,
  progress,
  requireAttachment,
  attachmentHint,
  factAnalysis,
}: QuestionCardProps) {
  const questionProgress = progress || question.progress;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      {/* 进度指示 */}
      {questionProgress && questionProgress.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">问题进度</span>
          <span className="font-medium">
            {questionProgress.current} / {questionProgress.total}
          </span>
        </div>
      )}

      {/* 问题内容 */}
      <div className="font-medium">{question.question}</div>

      {/* 事实分析 */}
      {factAnalysis && (
        <div className="space-y-2 border-muted border-t pt-3">
          <div className="font-medium text-muted-foreground text-xs">
            已提取信息
          </div>
          <div className="text-sm">{factAnalysis.summary}</div>
          {factAnalysis.extracted_facts.length > 0 && (
            <ul className="list-inside list-disc text-muted-foreground text-xs">
              {factAnalysis.extracted_facts.map((fact, idx) => (
                <li key={idx}>{fact}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 附件提示 */}
      {attachmentHint && (
        <div
          className={cn(
            "rounded-md px-3 py-2 text-xs",
            requireAttachment
              ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
              : "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
          )}
        >
          {attachmentHint}
        </div>
      )}
    </div>
  );
}

// ============================================================
// 劳动合同检查 (check_labor_contract 阶段)
// ============================================================
interface LaborContractCheckProps {
  message: string;
  canSkip?: boolean;
  isLoading?: boolean;
  onConfirm: (hasContract: boolean) => void;
  onSkip?: () => void;
}

export function LaborContractCheck({
  message,
  canSkip,
  isLoading,
  onConfirm,
  onSkip,
}: LaborContractCheckProps) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="font-medium">{message}</div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isLoading}
          onClick={() => onConfirm(true)}
          variant="default"
        >
          有劳动合同
        </Button>
        <Button
          disabled={isLoading}
          onClick={() => onConfirm(false)}
          variant="outline"
        >
          没有劳动合同
        </Button>
        {canSkip && onSkip && (
          <Button disabled={isLoading} onClick={onSkip} variant="ghost">
            跳过此步骤
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 补充信息表单 (supplement_info 阶段)
// ============================================================
interface SupplementFormProps {
  fields: SupplementField[];
  isLoading?: boolean;
  onSubmit: (values: Record<string, string>) => void;
}

export function SupplementForm({
  fields,
  isLoading,
  onSubmit,
}: SupplementFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  const isValid = fields
    .filter((f) => f.required)
    .every((f) => values[f.field_id]?.trim());

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div className="space-y-1.5" key={field.field_id}>
          <label className="font-medium text-sm" htmlFor={field.field_id}>
            {field.label}
            {field.required && <span className="text-red-500">*</span>}
          </label>

          {field.type === "textarea" ? (
            <Textarea
              disabled={isLoading}
              id={field.field_id}
              onChange={(e) => handleChange(field.field_id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              value={values[field.field_id] || ""}
            />
          ) : field.type === "select" && field.options ? (
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              id={field.field_id}
              onChange={(e) => handleChange(field.field_id, e.target.value)}
              required={field.required}
              value={values[field.field_id] || ""}
            >
              <option value="">{field.placeholder || "请选择..."}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <Input
              disabled={isLoading}
              id={field.field_id}
              onChange={(e) => handleChange(field.field_id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              type={field.type === "date" ? "date" : "text"}
              value={values[field.field_id] || ""}
            />
          )}
        </div>
      ))}

      <Button className="w-full" disabled={isLoading || !isValid} type="submit">
        {isLoading ? "提交中..." : "提交信息"}
      </Button>
    </form>
  );
}

// ============================================================
// 完成状态 (completed 阶段)
// ============================================================
interface CompletedDocumentProps {
  docType: string;
  content: string;
  downloadUrl?: string;
  onReset: () => void;
}

export function CompletedDocument({
  docType,
  content,
  downloadUrl,
  onReset,
}: CompletedDocumentProps) {
  return (
    <div className="space-y-4">
      {/* 文书类型标签 */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700 text-sm dark:bg-green-950/50 dark:text-green-400">
          {docType}
        </span>
        <span className="text-green-600 text-sm">已生成完成</span>
      </div>

      {/* 文书内容预览 */}
      <div className="max-h-96 overflow-y-auto rounded-lg border bg-white p-4 dark:bg-zinc-900">
        <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {downloadUrl && (
          <Button asChild className="flex-1">
            <a download href={downloadUrl}>
              下载文书
            </a>
          </Button>
        )}
        <Button className="flex-1" onClick={onReset} variant="outline">
          开始新的咨询
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 路径已选择确认 (path_selected 阶段)
// ============================================================
interface PathSelectedConfirmProps {
  message: string;
  autoCountdown?: number;
}

export function PathSelectedConfirm({
  message,
  autoCountdown,
}: PathSelectedConfirmProps) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
      <div className="flex items-center gap-2">
        <svg
          className="size-5 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M5 13l4 4L19 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <span className="font-medium text-green-700 dark:text-green-400">
          {message}
        </span>
      </div>
      {autoCountdown !== undefined && autoCountdown > 0 && (
        <div className="mt-2 text-green-600 text-sm">
          {autoCountdown} 秒后自动进入下一步...
        </div>
      )}
    </div>
  );
}
