"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { VoiceRecordingState } from "@/lib/legal/types";

// 最大录音时长（秒）
const MAX_RECORDING_DURATION = 60;
// 最小录音时长（秒）
const MIN_RECORDING_DURATION = 1;

interface UseVoiceRecorderOptions {
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onError?: (error: string) => void;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    duration: 0,
    isCancelled: false,
    error: null,
  });

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 清理资源
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // 请求麦克风权限
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of stream.getTracks()) {
        track.stop();
      }
      setHasPermission(true);
      return true;
    } catch {
      setHasPermission(false);
      setState((prev) => ({
        ...prev,
        error: "麦克风权限被拒绝",
      }));
      return false;
    }
  }, []);

  // 开始录音
  // biome-ignore lint/correctness/useExhaustiveDependencies: stopRecording 在后面声明，存在循环依赖
  const startRecording = useCallback(async () => {
    // 重置状态
    setState({
      isRecording: false,
      duration: 0,
      isCancelled: false,
      error: null,
    });
    chunksRef.current = [];

    try {
      // 获取媒体流
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);

      // 创建 MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;

      // 数据可用时收集
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 录音停止时处理
      mediaRecorder.onstop = () => {
        const duration = (Date.now() - startTimeRef.current) / 1000;

        if (state.isCancelled) {
          cleanup();
          return;
        }

        if (duration < MIN_RECORDING_DURATION) {
          setState((prev) => ({
            ...prev,
            isRecording: false,
            error: "录音时间太短",
          }));
          cleanup();
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        options.onRecordingComplete?.(blob, duration);
        cleanup();
      };

      mediaRecorder.onerror = () => {
        setState((prev) => ({
          ...prev,
          isRecording: false,
          error: "录音出错",
        }));
        options.onError?.("录音出错");
        cleanup();
      };

      // 开始录音
      mediaRecorder.start(100); // 每100ms收集一次数据
      startTimeRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        isRecording: true,
        duration: 0,
        error: null,
      }));

      // 开始计时
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setState((prev) => ({
          ...prev,
          duration: Math.floor(elapsed),
        }));

        // 达到最大时长自动停止
        if (elapsed >= MAX_RECORDING_DURATION) {
          stopRecording();
        }
      }, 100);
    } catch {
      setHasPermission(false);
      setState((prev) => ({
        ...prev,
        error: "无法访问麦克风",
      }));
      options.onError?.("无法访问麦克风");
    }
  }, [cleanup, options, state.isCancelled]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isRecording: false,
    }));
  }, []);

  // 取消录音
  const cancelRecording = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCancelled: true,
    }));

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    cleanup();

    setState({
      isRecording: false,
      duration: 0,
      isCancelled: false,
      error: null,
    });
  }, [cleanup]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    hasPermission,
    startRecording,
    stopRecording,
    cancelRecording,
    requestPermission,
  };
}
