"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, MicIcon, PlusIcon, XIcon } from "lucide-react";

import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { VoiceWaveform } from "./voice-waveform";

interface VoiceInputProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  disabled?: boolean;
}

interface InlineVoiceRecorderProps {
  isRecording: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}

/**
 * 内联语音录制UI组件
 * 在输入框位置显示波形动画和操作按钮
 */
export function InlineVoiceRecorder({
  isRecording,
  onCancel,
  onConfirm,
  disabled,
}: InlineVoiceRecorderProps) {
  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="flex h-[52px] w-full items-center gap-3 rounded-full border bg-background px-4"
          exit={{ opacity: 0, scale: 0.95 }}
          initial={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          {/* 左侧添加按钮占位（保持布局一致） */}
          <div className="flex size-8 shrink-0 items-center justify-center text-zinc-400">
            <PlusIcon className="size-5" />
          </div>

          {/* 中间波形动画 */}
          <div className="flex-1">
            <VoiceWaveform className="w-full" isRecording={isRecording} />
          </div>

          {/* 右侧操作按钮 */}
          <div className="flex items-center gap-2">
            {/* 取消按钮 */}
            <Button
              className="size-8 rounded-full"
              disabled={disabled}
              onClick={onCancel}
              size="icon"
              title="取消录音"
              variant="ghost"
            >
              <XIcon className="size-5" />
            </Button>

            {/* 确认按钮 */}
            <Button
              className="size-8 rounded-full"
              disabled={disabled}
              onClick={onConfirm}
              size="icon"
              title="确认发送"
              variant="ghost"
            >
              <CheckIcon className="size-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 语音输入Hook
 * 提供录制状态和控制方法
 */
export function useVoiceInput(
  onRecordingComplete: (blob: Blob, duration: number) => void
) {
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const recordingRef = useRef<{ blob: Blob | null; duration: number }>({
    blob: null,
    duration: 0,
  });

  const {
    isRecording,
    duration,
    error,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
  } = useVoiceRecorder({
    onRecordingComplete: (blob, dur) => {
      // 保存录制结果，等待用户确认
      recordingRef.current = { blob, duration: dur };
    },
    onError: (err) => {
      console.error("Voice recording error:", err);
      setIsRecordingMode(false);
    },
  });

  // 开始录音
  const handleStartRecording = useCallback(async () => {
    if (hasPermission === null) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    recordingRef.current = { blob: null, duration: 0 };
    setIsRecordingMode(true);
    await startRecording();
  }, [hasPermission, requestPermission, startRecording]);

  // 取消录音
  const handleCancel = useCallback(() => {
    cancelRecording();
    recordingRef.current = { blob: null, duration: 0 };
    setIsRecordingMode(false);
  }, [cancelRecording]);

  // 确认录音（停止并触发回调）
  const handleConfirm = useCallback(async () => {
    // 先停止录制
    stopRecording();

    // 等待一帧让 onRecordingComplete 回调执行
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 触发回调
    if (recordingRef.current.blob) {
      onRecordingComplete(
        recordingRef.current.blob,
        recordingRef.current.duration
      );
    }

    recordingRef.current = { blob: null, duration: 0 };
    setIsRecordingMode(false);
  }, [stopRecording, onRecordingComplete]);

  return {
    isRecordingMode,
    isRecording,
    duration,
    error,
    hasPermission,
    startRecording: handleStartRecording,
    cancelRecording: handleCancel,
    confirmRecording: handleConfirm,
  };
}

/**
 * 语音输入按钮组件
 * 点击后进入录音模式
 */
export function VoiceInput({ onRecordingComplete, disabled }: VoiceInputProps) {
  const isMobile = useIsMobile();
  const [isHolding, setIsHolding] = useState(false);
  const [cancelHint, setCancelHint] = useState(false);
  const startYRef = useRef<number>(0);

  const {
    isRecording,
    duration,
    error,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
  } = useVoiceRecorder({
    onRecordingComplete,
    onError: (err) => {
      console.error("Voice recording error:", err);
    },
  });

  // 格式化时间显示
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 桌面端点击处理
  const handleClick = useCallback(async () => {
    if (isMobile) return;

    if (hasPermission === null) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  }, [
    isMobile,
    hasPermission,
    isRecording,
    requestPermission,
    startRecording,
    stopRecording,
  ]);

  // 移动端触摸开始
  const handleTouchStart = useCallback(
    async (e: React.TouchEvent) => {
      if (!isMobile) return;

      e.preventDefault();
      startYRef.current = e.touches[0].clientY;
      setIsHolding(true);
      setCancelHint(false);

      if (hasPermission === null) {
        const granted = await requestPermission();
        if (!granted) {
          setIsHolding(false);
          return;
        }
      }

      await startRecording();
    },
    [isMobile, hasPermission, requestPermission, startRecording]
  );

  // 移动端触摸移动
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !isRecording) return;

      const currentY = e.touches[0].clientY;
      const deltaY = startYRef.current - currentY;

      // 向上滑动超过 50px 显示取消提示
      if (deltaY > 50) {
        setCancelHint(true);
      } else {
        setCancelHint(false);
      }
    },
    [isMobile, isRecording]
  );

  // 移动端触摸结束
  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;

    setIsHolding(false);

    if (cancelHint) {
      cancelRecording();
      setCancelHint(false);
    } else if (isRecording) {
      stopRecording();
    }
  }, [isMobile, cancelHint, isRecording, cancelRecording, stopRecording]);

  // 权限被拒绝时的提示
  if (hasPermission === false) {
    return (
      <Button
        className="text-muted-foreground"
        disabled
        size="icon"
        title="麦克风权限被拒绝"
        variant="ghost"
      >
        <MicIcon className="size-5 opacity-50" />
      </Button>
    );
  }

  return (
    <div className="relative">
      {/* 录音中的浮层 */}
      {isRecording && (
        <div className="absolute -top-16 left-1/2 z-10 -translate-x-1/2">
          <div
            className={cn(
              "flex flex-col items-center rounded-lg px-4 py-2 shadow-lg transition-colors",
              {
                "bg-red-500 text-white": cancelHint,
                "bg-background border": !cancelHint,
              }
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn("inline-block size-2 rounded-full", {
                  "bg-white animate-pulse": cancelHint,
                  "bg-red-500 animate-pulse": !cancelHint,
                })}
              />
              <span className="font-mono text-sm">
                {formatDuration(duration)}
              </span>
            </div>
            <span className="text-xs">
              {cancelHint
                ? "松开取消"
                : isMobile
                  ? "松开发送，上滑取消"
                  : "点击停止"}
            </span>
          </div>
        </div>
      )}

      {/* 按钮 */}
      <Button
        className={cn("relative transition-all", {
          "bg-red-500 text-white hover:bg-red-600": isRecording && !cancelHint,
          "bg-red-700 text-white": isRecording && cancelHint,
          "scale-110": isHolding,
        })}
        disabled={disabled}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        size="icon"
        title={isRecording ? "停止录音" : "语音输入"}
        variant={isRecording ? "destructive" : "ghost"}
      >
        {isRecording && cancelHint ? (
          <XIcon className="size-5" />
        ) : (
          <MicIcon className="size-5" />
        )}
      </Button>

      {/* 错误提示 */}
      {error && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-red-500 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
