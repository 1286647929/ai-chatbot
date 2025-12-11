"use client";

import { useCallback, useRef, useState } from "react";
import { MicIcon, XIcon } from "lucide-react";

import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface VoiceInputProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  disabled?: boolean;
}

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
