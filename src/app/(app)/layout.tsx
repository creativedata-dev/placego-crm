import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
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
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="border-b px-4 py-3 flex items-center gap-2 bg-background">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  );
}
