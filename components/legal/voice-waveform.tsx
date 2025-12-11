"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  isRecording: boolean;
  className?: string;
}

/**
 * 语音录制波形动画组件
 * 模拟 ChatGPT 风格的音频波形效果
 */
export function VoiceWaveform({ isRecording, className }: VoiceWaveformProps) {
  const [bars, setBars] = useState<number[]>(Array(24).fill(2));

  useEffect(() => {
    if (!isRecording) {
      // 停止录制时重置为最小高度
      setBars(Array(24).fill(2));
      return;
    }

    // 模拟音频波形动画
    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => {
          // 生成随机高度，模拟音频波形
          const random = Math.random();
          if (random < 0.3) return 2; // 30% 概率最小
          if (random < 0.6) return Math.random() * 8 + 4; // 30% 概率中等
          return Math.random() * 16 + 8; // 40% 概率较高
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-[2px] h-6",
        className
      )}
    >
      {bars.map((height, index) => (
        <motion.div
          animate={{ height }}
          className="w-[3px] rounded-full bg-zinc-400"
          initial={{ height: 2 }}
          // biome-ignore lint: index is stable for this animation
          key={index}
          transition={{
            duration: 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
