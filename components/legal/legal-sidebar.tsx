"use client";

import Link from "next/link";
import type { User } from "next-auth";
import { PlusIcon } from "@/components/icons";
import { SidebarUserNav } from "@/components/sidebar-user-nav";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LegalSidebar({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <Link
              className="flex flex-row items-center gap-3"
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
            >
              <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                法律文书助手
              </span>
            </Link>
            <div className="flex flex-row gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="h-8 p-1 md:h-fit md:p-2"
                    onClick={() => {
                      setOpenMobile(false);
                      // 触发自定义事件，通知 LegalChat 重置会话
                      window.dispatchEvent(new CustomEvent("legal-new-session"));
                    }}
                    type="button"
                    variant="ghost"
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent align="end" className="hidden md:block">
                  新建法律咨询
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex w-full flex-row items-center justify-center gap-2 px-2 text-sm text-zinc-500">
              法律咨询会话暂不保存历史记录
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>{user && <SidebarUserNav user={user} />}</SidebarFooter>
    </Sidebar>
  );
}
