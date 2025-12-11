"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";

import type { DocumentPath } from "@/lib/legal/types";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface DocumentPathSelectorProps {
  paths: DocumentPath[];
  onSelect: (path: DocumentPath) => void;
  isLoading?: boolean;
}

export function DocumentPathSelector({
  paths,
  onSelect,
  isLoading,
}: DocumentPathSelectorProps) {
  const [selectedPath, setSelectedPath] = useState<DocumentPath | null>(null);

  const handleSelect = (path: DocumentPath) => {
    setSelectedPath(path);
  };

  const handleConfirm = () => {
    if (selectedPath) {
      onSelect(selectedPath);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground text-sm">
        请选择要生成的文书类型：
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {paths.map((path) => (
          <Card
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50",
              {
                "border-primary ring-2 ring-primary/20":
                  selectedPath?.path_id === path.path_id,
                "border-green-500 bg-green-50/50 dark:bg-green-950/20":
                  path.is_recommended,
              }
            )}
            key={path.path_id}
            onClick={() => handleSelect(path)}
          >
            <CardHeader className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {path.path_name}
                    {path.is_recommended && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
                        推荐
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm">
                    {path.description}
                  </CardDescription>
                </div>
                {selectedPath?.path_id === path.path_id && (
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" />
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedPath && (
        <div className="flex justify-end">
          <Button disabled={isLoading} onClick={handleConfirm}>
            {isLoading ? "确认中..." : "确认选择"}
          </Button>
        </div>
      )}
    </div>
  );
}
