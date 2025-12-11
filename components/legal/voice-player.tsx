"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface VoicePlayerProps {
  src: string;
  duration?: number;
  transcription?: string;
  showTranscription?: boolean;
}

export function VoicePlayer({
  src,
  duration: initialDuration,
  transcription,
  showTranscription = true,
}: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [showText, setShowText] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  // 初始化音频元素
  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener("play", () => {
      setIsPlaying(true);
    });

    audio.addEventListener("pause", () => {
      setIsPlaying(false);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [src]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-2">
        {/* 播放按钮 */}
        <Button
          className="size-8 rounded-full"
          onClick={togglePlay}
          size="icon"
          variant="ghost"
        >
          {isPlaying ? (
            <PauseIcon className="size-4" />
          ) : (
            <PlayIcon className="size-4" />
          )}
        </Button>

        {/* 进度条 */}
        <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
          <div
            className="absolute h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 时间显示 */}
        <span className="font-mono text-muted-foreground text-xs">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* 转写文本 */}
      {transcription && showTranscription && (
        <div>
          <button
            className="text-muted-foreground text-xs hover:text-foreground"
            onClick={() => setShowText(!showText)}
          >
            {showText ? "隐藏文字" : "显示文字"}
          </button>
          {showText && (
            <p className="mt-1 rounded-lg bg-muted/50 p-2 text-sm">
              {transcription}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
