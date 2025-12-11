import { redirect } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { LegalChat } from "@/components/legal/legal-chat";

export default async function LegalPage() {
  const session = await auth();

  // 需要登录才能使用法律聊天
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <h1 className="font-semibold text-lg">法律文书助手</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <LegalChat />
      </main>
    </div>
  );
}
