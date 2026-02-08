import { cookies } from "next/headers";
import { Suspense } from "react";
import { LegalSidebar } from "@/components/legal/legal-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <LegalSidebarWrapper>{children}</LegalSidebarWrapper>
    </Suspense>
  );
}

async function LegalSidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <LegalSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
