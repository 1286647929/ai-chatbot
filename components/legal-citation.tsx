"use client";

import { AnimatePresence, motion } from "framer-motion";
import { memo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Scale, FileText, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 引用类型
 */
export type CitationType = "regulation" | "case" | "article" | "other";

/**
 * 引用数据结构
 */
export interface Citation {
  /** 引用类型 */
  type: CitationType;
  /** 标题 */
  title: string;
  /** 来源 */
  source?: string;
  /** URL 链接 */
  url?: string;
  /** 相关内容摘要 */
  snippet?: string;
  /** 日期 */
  date?: string;
  /** 额外元数据 */
  metadata?: Record<string, string>;
}

/**
 * 引用类型对应的图标和样式
 */
const CITATION_STYLES: Record<CitationType, { icon: ReactNode; color: string; bg: string }> = {
  regulation: {
    icon: <Scale className="size-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
  },
  case: {
    icon: <Gavel className="size-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800",
  },
  article: {
    icon: <FileText className="size-4" />,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
  },
  other: {
    icon: <FileText className="size-4" />,
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800",
  },
};

/**
 * 引用类型中文名称
 */
const CITATION_TYPE_NAMES: Record<CitationType, string> = {
  regulation: "法规",
  case: "案例",
  article: "文章",
  other: "其他",
};

interface LegalCitationProps {
  /** 引用数据 */
  citation: Citation;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 法律引用卡片组件
 * 展示法规、案例等引用信息
 */
function PureLegalCitation({
  citation,
  defaultExpanded = false,
  className,
}: LegalCitationProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { type, title, source, url, snippet, date, metadata } = citation;
  const { icon, color, bg } = CITATION_STYLES[type] || CITATION_STYLES.other;
  const typeName = CITATION_TYPE_NAMES[type] || "引用";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("border rounded-lg overflow-hidden", bg, className)}
    >
      {/* 头部 */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        {/* 类型图标 */}
        <span className={cn("shrink-0", color)}>{icon}</span>

        {/* 类型标签 */}
        <span
          className={cn(
            "shrink-0 text-xs px-1.5 py-0.5 rounded",
            color,
            "bg-white/50 dark:bg-black/20"
          )}
        >
          {typeName}
        </span>

        {/* 标题 */}
        <span className="flex-1 text-left text-sm font-medium truncate">
          {title}
        </span>

        {/* 链接图标 */}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-4" />
          </a>
        )}

        {/* 展开/折叠图标 */}
        <span className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </button>

      {/* 展开内容 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 text-sm">
              {/* 来源和日期 */}
              {(source || date) && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  {source && <span>{source}</span>}
                  {source && date && <span>·</span>}
                  {date && <span>{date}</span>}
                </div>
              )}

              {/* 摘要 */}
              {snippet && (
                <p className="text-muted-foreground leading-relaxed">
                  {snippet}
                </p>
              )}

              {/* 元数据 */}
              {metadata && Object.keys(metadata).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(metadata).map(([key, value]) => (
                    <span
                      key={key}
                      className="text-xs px-2 py-0.5 rounded bg-white/50 dark:bg-black/20 text-muted-foreground"
                    >
                      {key}: {value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const LegalCitation = memo(PureLegalCitation);

interface LegalCitationListProps {
  /** 引用列表 */
  citations: Citation[];
  /** 是否默认全部展开 */
  defaultExpanded?: boolean;
  /** 最大显示数量（超出后折叠） */
  maxVisible?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 法律引用列表组件
 * 展示多个法律引用
 */
function PureLegalCitationList({
  citations,
  defaultExpanded = false,
  maxVisible = 3,
  className,
}: LegalCitationListProps) {
  const [showAll, setShowAll] = useState(false);

  if (citations.length === 0) return null;

  const visibleCitations = showAll
    ? citations
    : citations.slice(0, maxVisible);
  const hiddenCount = citations.length - maxVisible;

  return (
    <div className={cn("space-y-2", className)}>
      {/* 标题 */}
      <div className="text-xs font-medium text-muted-foreground">
        参考引用 ({citations.length})
      </div>

      {/* 引用列表 */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {visibleCitations.map((citation, index) => (
            <LegalCitation
              key={`${citation.type}-${citation.title}-${index}`}
              citation={citation}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 显示更多按钮 */}
      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          显示更多 ({hiddenCount} 条)
        </button>
      )}

      {/* 收起按钮 */}
      {showAll && citations.length > maxVisible && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          收起
        </button>
      )}
    </div>
  );
}

export const LegalCitationList = memo(PureLegalCitationList);
