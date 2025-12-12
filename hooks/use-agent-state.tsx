"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Agent 状态
 */
export interface AgentState {
  agent: string;
  status: "idle" | "running" | "completed" | "error" | "timeout";
  error?: string;
}

/**
 * 路由决策信息
 */
export interface RoutingState {
  intent: string;
  confidence: number;
  selectedAgents: string[];
  reason: string;
}

/**
 * Agent 上下文值
 */
interface AgentContextValue {
  /** Agent 状态列表 */
  agentStates: AgentState[];
  /** 路由决策信息 */
  routing: RoutingState | null;
  /** 是否为法律多 Agent 模式 */
  isLegalMode: boolean;
  /** 更新 Agent 状态 */
  updateAgentState: (state: AgentState) => void;
  /** 设置路由信息 */
  setRouting: (routing: RoutingState) => void;
  /** 重置状态 */
  reset: () => void;
  /** 设置法律模式 */
  setLegalMode: (isLegal: boolean) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

/**
 * Agent 状态 Provider
 */
export function AgentProvider({ children }: { children: ReactNode }) {
  const [agentStates, setAgentStates] = useState<AgentState[]>([]);
  const [routing, setRoutingState] = useState<RoutingState | null>(null);
  const [isLegalMode, setLegalMode] = useState(false);

  const updateAgentState = (newState: AgentState) => {
    setAgentStates((prev) => {
      const existingIndex = prev.findIndex((s) => s.agent === newState.agent);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newState;
        return updated;
      }
      return [...prev, newState];
    });
  };

  const setRouting = (newRouting: RoutingState) => {
    setRoutingState(newRouting);
    // 初始化所有选中 Agent 的状态为 idle
    setAgentStates(
      newRouting.selectedAgents.map((agent) => ({
        agent,
        status: "idle",
      }))
    );
  };

  const reset = () => {
    setAgentStates([]);
    setRoutingState(null);
  };

  const value = useMemo(
    () => ({
      agentStates,
      routing,
      isLegalMode,
      updateAgentState,
      setRouting,
      reset,
      setLegalMode,
    }),
    [agentStates, routing, isLegalMode]
  );

  return (
    <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
  );
}

/**
 * 使用 Agent 状态的 hook
 */
export function useAgentState() {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgentState must be used within an AgentProvider");
  }
  return context;
}
