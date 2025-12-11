"use client";

import { memo } from "react";
import { useWindowSize } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/icons";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { useSidebar } from "@/components/ui/sidebar";

function PureLegalChatHeader() {
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="h-8 px-2 md:h-fit md:px-2"
          onClick={() => {
            // 触发自定义事件，通知 LegalChat 重置会话
            window.dispatchEvent(new CustomEvent("legal-new-session"));
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">新建咨询</span>
        </Button>
      )}

      <div className="ml-auto font-medium text-sm text-muted-foreground">
        法律文书助手
      </div>
    </header>
  );
}

export const LegalChatHeader = memo(PureLegalChatHeader);
