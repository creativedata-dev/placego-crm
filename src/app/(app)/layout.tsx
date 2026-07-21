import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageTitle } from "@/components/layout/page-title";
import { requireAuth } from "@/lib/auth";
import { NAV_BY_ROLE } from "@/lib/navigation";
import type { UserRole } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const navItems = NAV_BY_ROLE[user.role as UserRole] ?? [];

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email, role: user.role }}
        navItems={navItems}
      />
      <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <header className="border-b px-3 py-2.5 flex items-center gap-3 bg-zinc-900 sm:bg-background sm:border-b sm:px-4 sm:py-3">
          <SidebarTrigger className="text-white/80 hover:text-white sm:text-foreground" />
          <PageTitle />
        </header>
        <div className="flex-1 p-3 sm:p-6 min-w-0">{children}</div>
      </main>
    </SidebarProvider>
  );
}
