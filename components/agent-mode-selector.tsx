"use client";

import { memo } from "react";
import { Scale, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Agent 模式
 */
export type AgentModeType = "default" | "legal";

/**
 * Agent 模式配置
 */
const AGENT_MODE_CONFIG: Record<
  AgentModeType,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
  }
> = {
  default: {
    label: "通用模式",
    description: "使用通用 AI 助手回答问题",
    icon: <MessageSquare className="size-4" />,
  },
  legal: {
    label: "法律助手",
    description: "专业法律问答，支持法规检索和案例分析",
    icon: <Scale className="size-4" />,
  },
};

interface AgentModeSelectorProps {
  /** 当前选中的模式 */
  value: AgentModeType;
  /** 模式变更回调 */
  onChange: (mode: AgentModeType) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否为紧凑模式 */
  compact?: boolean;
}

/**
 * Agent 模式选择器组件
 */
function PureAgentModeSelector({
  value,
  onChange,
  disabled = false,
  className,
  compact = false,
}: AgentModeSelectorProps) {
  const currentMode = AGENT_MODE_CONFIG[value];

  if (compact) {
    // 紧凑模式：只显示图标和下拉箭头
    return (
      <TooltipProvider>
        <Tooltip>
          <Select
            disabled={disabled}
            onValueChange={(v) => onChange(v as AgentModeType)}
            value={value}
          >
            <TooltipTrigger asChild>
              <SelectTrigger
                className={cn(
                  "h-8 w-auto gap-1 border-none bg-transparent px-2 shadow-none focus:ring-0",
                  className
                )}
              >
                <span
                  className={cn(
                    value === "legal"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-muted-foreground"
                  )}
                >
                  {currentMode.icon}
                </span>
              </SelectTrigger>
            </TooltipTrigger>
            <SelectContent>
              {Object.entries(AGENT_MODE_CONFIG).map(([mode, config]) => (
                <SelectItem key={mode} value={mode}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        mode === "legal"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {config.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TooltipContent>
            <p>{currentMode.label}</p>
            <p className="text-xs text-muted-foreground">
              {currentMode.description}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 完整模式
  return (
    <Select
      disabled={disabled}
      onValueChange={(v) => onChange(v as AgentModeType)}
      value={value}
    >
      <SelectTrigger className={cn("w-[180px]", className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                value === "legal"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-muted-foreground"
              )}
            >
              {currentMode.icon}
            </span>
            <span>{currentMode.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(AGENT_MODE_CONFIG).map(([mode, config]) => (
          <SelectItem key={mode} value={mode}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  mode === "legal"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground"
                )}
              >
                {config.icon}
              </span>
              <div className="flex flex-col">
                <span className="font-medium">{config.label}</span>
                <span className="text-xs text-muted-foreground">
                  {config.description}
                </span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const AgentModeSelector = memo(PureAgentModeSelector);
