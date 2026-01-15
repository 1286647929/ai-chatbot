import { LegalChat } from "@/components/legal/legal-chat";
import { LegalChatHeader } from "@/components/legal/legal-chat-header";

export default function LegalPage() {
  return (
    <>
      <LegalChatHeader />
      <div className="flex h-[calc(100dvh-52px)] flex-col bg-background">
        <LegalChat />
      </div>
    </>
  );
}

