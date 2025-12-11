import { redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { LegalChat } from "@/components/legal/legal-chat";
import { LegalChatHeader } from "@/components/legal/legal-chat-header";

export default async function LegalPage() {
  const session = await auth();

  // 需要登录才能使用法律聊天
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <>
      <LegalChatHeader />
      <div className="flex h-[calc(100dvh-52px)] flex-col bg-background">
        <LegalChat />
      </div>
    </>
  );
}
