"use client";

import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { PaperclipIcon } from "lucide-react";
import { toast } from "sonner";

import { useLegalChat } from "@/hooks/use-legal-chat";
import type { LegalAttachment, LegalMessage, LegalStep } from "@/lib/legal/types";
import { cn } from "@/lib/utils";
import { AttachmentAnalysisCard } from "./attachment-analysis";
import { VoiceInput } from "./voice-input";
import { Response } from "../elements/response";
import { SparklesIcon, StopIcon } from "../icons";
import { PreviewAttachment } from "../preview-attachment";
import {
  CaseInfoCard,
  CompletedDocument,
  ConsultationProgressIndicator,
  DocumentPathSelector,
  LaborContractCheck,
  PathSelectedConfirm,
  QuestionCard,
  SupplementForm,
} from "./step-renderers";
import { Button } from "../ui/button";
import { ImagePreview } from "../ui/image-preview";
import { Textarea } from "../ui/textarea";

// ============================================================
// 法律聊天欢迎语
// ============================================================
function LegalGreeting() {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="legal-overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        法律文书助手
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        请描述您遇到的法律问题，我将帮您生成相应的法律文书。
      </motion.div>
    </div>
  );
}

// ============================================================
// 单条消息组件
// ============================================================
function LegalMessageItem({
  message,
  isStreaming,
}: {
  message: LegalMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={message.role}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": isUser,
          "justify-start": !isUser,
        })}
      >
        {!isUser && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div
          className={cn("flex flex-col gap-2", {
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]": isUser,
            "w-full": !isUser,
          })}
        >
          {/* 用户附件 */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.attachments.map((attachment) => {
                const imageUrl = attachment.local_url || attachment.file_url;
                const isImage = attachment.content_type.startsWith("image/");

                if (isImage && imageUrl) {
                  return (
                    <ImagePreview
                      alt={attachment.file_name}
                      key={attachment.attachment_id}
                      src={imageUrl}
                    />
                  );
                }

                // 非图片文件显示文件名
                return (
                  <div
                    className="rounded-lg border bg-muted/50 px-3 py-2 text-sm"
                    key={attachment.attachment_id}
                  >
                    {attachment.file_name}
                  </div>
                );
              })}
            </div>
          )}

          {/* 消息内容 */}
          <div
            className={cn("rounded-2xl px-3 py-2", {
              "bg-[#006cff] text-white text-right": isUser,
              "bg-transparent px-0 py-0": !isUser,
            })}
          >
            {isUser ? (
              message.content
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <Response>{message.content}</Response>
                {isStreaming && message.is_streaming && (
                  <span className="inline-block animate-pulse">▊</span>
                )}
              </div>
            )}
          </div>

          {/* 附件分析结果 */}
          {message.data?.attachment_analysis &&
            message.data.attachment_analysis.length > 0 && (
              <div className="space-y-2">
                {message.data.attachment_analysis.map((analysis) => (
                  <AttachmentAnalysisCard
                    analysis={analysis}
                    key={analysis.attachment_id}
                  />
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 思考中状态
// ============================================================
function ThinkingIndicator() {
  return (
    <div
      className="group/message fade-in w-full animate-in duration-300"
      data-role="assistant"
    >
      <div className="flex items-start justify-start gap-3">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <div className="animate-pulse">
            <SparklesIcon size={14} />
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:gap-4">
          <div className="flex items-center gap-1 p-0 text-muted-foreground text-sm">
            <span className="animate-pulse">思考中</span>
            <span className="inline-flex">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 根据 step 渲染特定的交互组件
// ============================================================
interface StepInteractionProps {
  currentStep: LegalStep;
  // State props
  caseInfo?: { case_type: string; confidence: number };
  documentPaths: import("@/lib/legal/types").DocumentPath[];
  recommendedPath: import("@/lib/legal/types").RecommendedPath | null;
  consultationProgress: import("@/lib/legal/types").ConsultationProgress | null;
  needMoreInfo: boolean;
  canProceed: boolean;
  currentQuestion: import("@/lib/legal/types").QuestionMeta | null;
  questionProgress: import("@/lib/legal/types").QuestionProgress | null;
  requireAttachment: boolean;
  attachmentHint: string | null;
  factAnalysis: import("@/lib/legal/types").FactAnalysis | null;
  canSkipContract: boolean;
  supplementFields: import("@/lib/legal/types").SupplementField[];
  completedDocument?: {
    document_id: string;
    doc_type: string;
    content: string;
    download_url: string;
  };
  isLoading: boolean;
  // Action props
  onSelectPath: (path: import("@/lib/legal/types").DocumentPath) => void;
  onContractCheck: (hasContract: boolean) => void;
  onSkipContract: () => void;
  onSubmitSupplement: (values: Record<string, string>) => void;
  onReset: () => void;
}

function StepInteraction({
  currentStep,
  caseInfo,
  documentPaths,
  recommendedPath,
  consultationProgress,
  needMoreInfo,
  canProceed,
  currentQuestion,
  questionProgress,
  requireAttachment,
  attachmentHint,
  factAnalysis,
  canSkipContract,
  supplementFields,
  completedDocument,
  isLoading,
  onSelectPath,
  onContractCheck,
  onSkipContract,
  onSubmitSupplement,
  onReset,
}: StepInteractionProps) {
  // 根据 currentStep 返回对应的交互组件
  switch (currentStep) {
    case "consulting":
      // 咨询阶段：显示进度指示器
      if (consultationProgress) {
        return (
          <ConsultationProgressIndicator
            canProceed={canProceed}
            needMoreInfo={needMoreInfo}
            progress={consultationProgress}
          />
        );
      }
      return null;

    case "select_document_path":
      // 文书路径选择阶段
      return (
        <div className="space-y-4">
          {/* 案由信息卡片 */}
          {caseInfo && (
            <CaseInfoCard
              caseType={caseInfo.case_type}
              confidence={caseInfo.confidence}
            />
          )}
          {/* 路径选择器 */}
          {documentPaths.length > 0 && (
            <DocumentPathSelector
              isLoading={isLoading}
              onSelect={onSelectPath}
              paths={documentPaths}
              recommendedPath={recommendedPath}
            />
          )}
        </div>
      );

    case "path_selected":
      // 路径已选择：显示确认信息
      return <PathSelectedConfirm message="已确认选择，正在准备问题..." />;

    case "ask_question":
      // 问答阶段：显示问题卡片
      if (currentQuestion) {
        return (
          <QuestionCard
            attachmentHint={attachmentHint}
            factAnalysis={factAnalysis}
            progress={questionProgress}
            question={currentQuestion}
            requireAttachment={requireAttachment}
          />
        );
      }
      return null;

    case "check_labor_contract":
      // 劳动合同检查
      return (
        <LaborContractCheck
          canSkip={canSkipContract}
          isLoading={isLoading}
          message="请确认您是否有劳动合同"
          onConfirm={onContractCheck}
          onSkip={onSkipContract}
        />
      );

    case "supplement_info":
      // 补充信息表单
      if (supplementFields.length > 0) {
        return (
          <SupplementForm
            fields={supplementFields}
            isLoading={isLoading}
            onSubmit={onSubmitSupplement}
          />
        );
      }
      return null;

    case "completed":
      // 完成状态
      if (completedDocument) {
        return (
          <CompletedDocument
            content={completedDocument.content}
            docType={completedDocument.doc_type}
            downloadUrl={completedDocument.download_url}
            onReset={onReset}
          />
        );
      }
      return null;

    default:
      return null;
  }
}

// ============================================================
// 主聊天组件
// ============================================================
export function LegalChat() {
  const {
    // 状态
    currentStep,
    messages,
    isLoading,
    isStreaming,
    error,
    // 各阶段专属状态
    caseInfo,
    documentPaths,
    recommendedPath,
    consultationProgress,
    needMoreInfo,
    canProceed,
    currentQuestion,
    questionProgress,
    requireAttachment,
    attachmentHint,
    factAnalysis,
    canSkipContract,
    supplementFields,
    completedDocument,
    streamingEnabled,
    // 方法
    sendMessage,
    selectPath,
    autoContinue,
    skipContractCheck,
    submitSupplementInfo,
    stopStream,
    reset,
    initSession,
    setStreamingEnabled,
  } = useLegalChat({ enableStreaming: false });

  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<LegalAttachment[]>([]);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoContiuneTriggeredRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // 初始化会话（使用 ref 防止 React Strict Mode 下重复调用）
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    initSession();
  }, [initSession]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStep]);

  // 处理 path_selected 的自动继续
  useEffect(() => {
    if (currentStep === "path_selected" && !autoContiuneTriggeredRef.current) {
      autoContiuneTriggeredRef.current = true;
      // 延迟 1 秒后自动继续
      const timer = setTimeout(() => {
        autoContinue();
      }, 1000);
      return () => clearTimeout(timer);
    }
    // 重置标记
    if (currentStep !== "path_selected") {
      autoContiuneTriggeredRef.current = false;
    }
  }, [currentStep, autoContinue]);

  // 发送消息
  const handleSend = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isLoading || isStreaming) {
      return;
    }

    setInputValue("");
    await sendMessage(
      trimmedValue,
      attachments.length > 0 ? attachments : undefined
    );
    setAttachments([]);
  };

  // 获取 OSS 文件 URL（带重试机制，因为后端异步上传 OSS）
  const fetchOssUrls = useCallback(async (
    ossIds: string[],
    maxRetries = 3,
    retryDelay = 1500
  ): Promise<Map<string, string>> => {
    if (ossIds.length === 0) return new Map();

    const urlMap = new Map<string, string>();
    let remainingIds = [...ossIds];

    for (let attempt = 0; attempt < maxRetries && remainingIds.length > 0; attempt++) {
      // 第一次之后等待一段时间再重试
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      try {
        const response = await fetch(`/api/textract/oss-info?ossIds=${remainingIds.join(",")}`);
        if (!response.ok) {
          console.error("Failed to fetch OSS URLs, attempt:", attempt + 1);
          continue;
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.ossId && item.url) {
              urlMap.set(String(item.ossId), item.url);
            }
          }
        }

        // 过滤出还未获取到 URL 的 ID
        remainingIds = remainingIds.filter((id) => !urlMap.has(id));
      } catch (error) {
        console.error("Fetch OSS URLs error, attempt:", attempt + 1, error);
      }
    }

    return urlMap;
  }, []);

  // 上传文件到 Textract 服务（同时进行 OCR 和 OSS 存储）
  const uploadFilesToTextract = useCallback(async (
    files: File[],
    scene: string
  ): Promise<LegalAttachment[]> => {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    formData.append("scene", scene);

    try {
      const response = await fetch("/api/textract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        toast.error("文件处理失败");
        return [];
      }

      const data = await response.json();

      // 解析响应，创建附件列表
      const attachmentList: LegalAttachment[] = [];
      const ossIds: string[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const result of data.results) {
          // 找到对应的原始文件（用于创建本地预览 URL）
          const originalFile = files.find((f) => f.name === result.filename);
          const localUrl = originalFile ? URL.createObjectURL(originalFile) : undefined;

          const ossId = result.ossId || result.filename;
          if (result.ossId) {
            ossIds.push(result.ossId);
          }

          attachmentList.push({
            attachment_id: ossId,
            file_name: result.filename,
            content_type: originalFile?.type || "application/octet-stream",
            local_url: localUrl,
            text_content: result.status === "success" ? result.text : undefined,
            is_extracting: false,
            extraction_error: result.status === "failed" ? (result.error || "处理失败") : undefined,
          });
        }
      }

      // 异步获取 OSS URL（不阻塞返回）
      if (ossIds.length > 0) {
        fetchOssUrls(ossIds).then((urlMap) => {
          if (urlMap.size > 0) {
            setAttachments((prev) =>
              prev.map((a) => {
                const ossUrl = urlMap.get(a.attachment_id);
                if (ossUrl) {
                  return { ...a, file_url: ossUrl };
                }
                return a;
              })
            );
          }
        });
      }

      return attachmentList;
    } catch (error) {
      console.error("Textract error:", error);
      toast.error("文件处理失败");
      return [];
    }
  }, [fetchOssUrls]);

  // 处理文件选择
  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      setUploadQueue(files.map((f) => f.name));

      try {
        // 根据文件类型确定 scene
        const hasAudio = files.some((f) => f.type.startsWith("audio/"));
        const scene = hasAudio ? "voice" : "legal";

        // 直接调用 textract API（后端会同时进行 OCR 和 OSS 存储）
        const uploadedAttachments = await uploadFilesToTextract(files, scene);

        if (uploadedAttachments.length > 0) {
          setAttachments((prev) => [...prev, ...uploadedAttachments]);
        }
      } finally {
        setUploadQueue([]);
        // 重置 input 以允许重复选择相同文件
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [uploadFilesToTextract]
  );

  // 移除附件
  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.attachment_id === attachmentId);
      // 释放本地 Object URL
      if (attachment?.local_url) {
        URL.revokeObjectURL(attachment.local_url);
      }
      return prev.filter((a) => a.attachment_id !== attachmentId);
    });
  }, []);

  // 语音录制完成后处理
  const handleVoiceRecordingComplete = useCallback(
    async (blob: Blob, _duration: number) => {
      const fileName = `voice_${Date.now()}.webm`;
      const file = new File([blob], fileName, { type: blob.type });

      try {
        // 直接调用 textract API（后端会同时进行语音识别和 OSS 存储）
        const uploadedAttachments = await uploadFilesToTextract([file], "voice");

        if (uploadedAttachments.length > 0) {
          const attachment = uploadedAttachments[0];
          setAttachments((prev) => [...prev, attachment]);

          // 如果有识别出的文本，自动填入输入框
          if (attachment.text_content) {
            setInputValue((prev) =>
              prev ? `${prev} ${attachment.text_content}` : attachment.text_content || ""
            );
          } else if (attachment.extraction_error) {
            toast.error("语音识别失败");
          }
        } else {
          toast.error("语音处理失败");
        }
      } catch (error) {
        console.error("Voice upload error:", error);
        toast.error("语音处理失败");
      }
    },
    [uploadFilesToTextract]
  );


  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 处理劳动合同检查
  const handleContractCheck = async (hasContract: boolean) => {
    await sendMessage(hasContract ? "有劳动合同" : "没有劳动合同");
  };

  // 显示输入区域的条件
  const showInput =
    currentStep === "greeting" ||
    currentStep === "consulting" ||
    currentStep === "ask_question";

  // 是否显示交互组件（不在 completed 阶段显示输入框）
  const showStepInteraction =
    currentStep !== "greeting" && currentStep !== "completed";

  return (
    <div className="flex h-full flex-col">
      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-4">
          {/* 空状态 */}
          {messages.length === 0 && !isLoading && <LegalGreeting />}

          {/* 消息列表 */}
          <div className="space-y-4">
            {messages.map((message) => (
              <LegalMessageItem
                isStreaming={isStreaming}
                key={message.id}
                message={message}
              />
            ))}

            {/* 加载状态 */}
            {isLoading && !isStreaming && <ThinkingIndicator />}

            {/* 错误信息 */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-950/50">
                {error}
              </div>
            )}

            {/* 阶段专属交互组件 */}
            {showStepInteraction && (
              <StepInteraction
                attachmentHint={attachmentHint}
                canProceed={canProceed}
                canSkipContract={canSkipContract}
                caseInfo={caseInfo}
                completedDocument={completedDocument}
                consultationProgress={consultationProgress}
                currentQuestion={currentQuestion}
                currentStep={currentStep}
                documentPaths={documentPaths}
                factAnalysis={factAnalysis}
                isLoading={isLoading}
                needMoreInfo={needMoreInfo}
                onContractCheck={handleContractCheck}
                onReset={reset}
                onSelectPath={selectPath}
                onSkipContract={skipContractCheck}
                onSubmitSupplement={submitSupplementInfo}
                questionProgress={questionProgress}
                recommendedPath={recommendedPath}
                requireAttachment={requireAttachment}
                supplementFields={supplementFields}
              />
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      {showInput && (
        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-3xl">
            {/* 隐藏的文件输入 */}
            <input
              accept="image/*,application/pdf,.doc,.docx,audio/*"
              className="hidden"
              multiple
              onChange={handleFileChange}
              ref={fileInputRef}
              type="file"
            />

            {/* 附件预览区域 */}
            {(attachments.length > 0 || uploadQueue.length > 0) && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div className="group relative" key={attachment.attachment_id}>
                    <PreviewAttachment
                      attachment={{
                        url: attachment.local_url || attachment.file_url || "",
                        name: attachment.file_name,
                        contentType: attachment.content_type,
                      }}
                      isExtracting={attachment.is_extracting}
                      extractionError={attachment.extraction_error}
                      onRemove={() => removeAttachment(attachment.attachment_id)}
                    />
                  </div>
                ))}
                {uploadQueue.map((fileName) => (
                  <PreviewAttachment
                    attachment={{
                      url: "",
                      name: fileName,
                      contentType: "",
                    }}
                    isUploading={true}
                    key={fileName}
                  />
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2">
              <Textarea
                className="min-h-[80px] resize-none pr-12"
                disabled={isLoading || isStreaming}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentStep === "ask_question"
                    ? "请回答上述问题..."
                    : "请描述您的法律问题..."
                }
                ref={textareaRef}
                rows={3}
                value={inputValue}
              />

              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                {/* 附件上传按钮 */}
                <Button
                  className="size-8"
                  disabled={isLoading || isStreaming}
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  title="上传附件"
                  variant="ghost"
                >
                  <PaperclipIcon className="size-4" />
                </Button>

                {/* 语音输入按钮 */}
                <VoiceInput
                  disabled={isLoading || isStreaming}
                  onRecordingComplete={handleVoiceRecordingComplete}
                />

                {isStreaming ? (
                  <Button
                    className="size-8"
                    onClick={stopStream}
                    size="icon"
                    variant="ghost"
                  >
                    <StopIcon size={16} />
                  </Button>
                ) : (
                  <Button
                    className="size-8"
                    disabled={!inputValue.trim() || isLoading}
                    onClick={handleSend}
                    size="icon"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M22 2L11 13"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                      <path
                        d="M22 2L15 22L11 13L2 9L22 2Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </Button>
                )}
              </div>
            </div>

            {/* 重置按钮和流式开关 */}
            <div className="mt-2 flex items-center justify-between">
              <button
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
                  streamingEnabled
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                )}
                onClick={() => setStreamingEnabled(!streamingEnabled)}
                type="button"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    streamingEnabled ? "bg-blue-500" : "bg-zinc-400"
                  )}
                />
                {streamingEnabled ? "流式响应" : "普通响应"}
              </button>

              {messages.length > 0 && (
                <Button onClick={reset} size="sm" variant="ghost">
                  重新开始
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 完成状态时的底部操作区 */}
      {currentStep === "completed" && !completedDocument && (
        <div className="border-t bg-background p-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-green-600">文书已生成完成！</p>
            <Button onClick={reset} variant="outline">
              开始新的咨询
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
