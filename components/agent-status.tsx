"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Agent 类型和对应的中文名称
 */
const AGENT_NAMES: Record<string, string> = {
  router: "路由决策",
  "legal-research": "法律研究",
  "case-analysis": "案例分析",
  "legal-advisor": "法律顾问",
  "document-draft": "文书起草",
};

/**
 * Agent 状态对应的样式
 */
const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  idle: { color: "text-muted-foreground", bg: "bg-muted" },
  running: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  completed: { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
  error: { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
  timeout: { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
};

interface AgentStatusProps {
  /** Agent 类型 */
  agent: string;
  /** Agent 状态 */
  status: "idle" | "running" | "completed" | "error" | "timeout";
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 错误信息 */
  error?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * Agent 状态指示器组件
 * 显示当前工作的 Agent 及其状态
 */
function PureAgentStatus({
  agent,
  status,
  showDetails = false,
  error,
  className,
}: AgentStatusProps) {
  const agentName = AGENT_NAMES[agent] || agent;
  const { color, bg } = STATUS_STYLES[status] || STATUS_STYLES.idle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
        bg,
        className
      )}
    >
      {/* 状态指示点 */}
      <span
        className={cn(
          "size-2 rounded-full",
          status === "running" && "animate-pulse",
          status === "idle" && "bg-muted-foreground",
          status === "running" && "bg-blue-500",
          status === "completed" && "bg-green-500",
          status === "error" && "bg-red-500",
          status === "timeout" && "bg-yellow-500"
        )}
      />

      {/* Agent 名称 */}
      <span className={cn("font-medium", color)}>{agentName}</span>

      {/* 状态文本 */}
      {showDetails && (
        <span className="text-muted-foreground">
          {status === "running" && "处理中..."}
          {status === "completed" && "已完成"}
          {status === "error" && "出错"}
          {status === "timeout" && "超时"}
        </span>
      )}

      {/* 错误信息 */}
      {error && status === "error" && (
        <span className="text-xs text-red-500 ml-1" title={error}>
          ({error.substring(0, 20)}...)
        </span>
      )}
    </motion.div>
  );
}

export const AgentStatus = memo(PureAgentStatus);

interface AgentStatusListProps {
  /** Agent 状态列表 */
  agents: Array<{
    agent: string;
    status: "idle" | "running" | "completed" | "error" | "timeout";
    error?: string;
  }>;
  /** 自定义类名 */
  className?: string;
}

/**
 * Agent 状态列表组件
 * 显示多个 Agent 的状态
 */
function PureAgentStatusList({ agents, className }: AgentStatusListProps) {
  if (agents.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <AnimatePresence mode="popLayout">
        {agents.map(({ agent, status, error }) => (
          <AgentStatus
            key={agent}
            agent={agent}
            status={status}
            error={error}
            showDetails={status !== "idle"}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export const AgentStatusList = memo(PureAgentStatusList);

interface RoutingInfoProps {
  /** 识别的意图 */
  intent: string;
  /** 置信度 */
  confidence: number;
  /** 选中的 Agents */
  selectedAgents: string[];
  /** 路由原因 */
  reason?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 路由信息组件
 * 显示意图识别和路由决策信息
 */
function PureRoutingInfo({
  intent,
  confidence,
  selectedAgents,
  reason,
  className,
}: RoutingInfoProps) {
  const confidencePercent = Math.round(confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "text-xs text-muted-foreground border rounded-lg p-2 space-y-1",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">意图识别:</span>
        <span>{intent}</span>
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-xs",
            confidencePercent >= 80
              ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
              : confidencePercent >= 60
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          )}
        >
          {confidencePercent}%
        </span>
      </div>

      {selectedAgents.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-medium">执行链路:</span>
          <span>
            {selectedAgents.map((agent) => AGENT_NAMES[agent] || agent).join(" → ")}
          </span>
        </div>
      )}

      {reason && (
        <div className="text-muted-foreground/70 italic">{reason}</div>
      )}
    </motion.div>
  );
}

export const RoutingInfo = memo(PureRoutingInfo);
