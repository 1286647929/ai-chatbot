"use client";

import { memo } from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WebSearchToggleProps {
  /** 是否启用 Web 搜索 */
  enabled: boolean;
  /** 切换回调 */
  onChange: (enabled: boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * Web 搜索开关组件
 * 用于控制是否启用 Web 搜索功能
 */
function PureWebSearchToggle({
  enabled,
  onChange,
  disabled = false,
  className,
}: WebSearchToggleProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={cn(
              "h-8 w-8 rounded-lg p-0 transition-colors",
              enabled
                ? "bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                : "bg-transparent text-muted-foreground hover:bg-accent",
              className
            )}
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Globe className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{enabled ? "Web 搜索已启用" : "Web 搜索已禁用"}</p>
          <p className="text-xs text-muted-foreground">
            {enabled ? "点击禁用 Web 搜索" : "点击启用 Web 搜索"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const WebSearchToggle = memo(PureWebSearchToggle);
