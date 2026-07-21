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

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <SidebarProvider>
      <AppSidebar
        user={{ name: user.name, email: user.email, role: user.role }}
        navItems={navItems}
      />
      <main className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Header fixo no mobile */}
        <header className="sticky top-0 z-40 border-b px-3 py-2.5 flex items-center gap-3 bg-zinc-900 sm:bg-background sm:px-4 sm:py-3">
          <SidebarTrigger className="text-white/80 hover:text-white sm:text-foreground shrink-0" />
          <PageTitle />
          {/* Avatar + logout — só mobile */}
          <div className="sm:hidden ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-white">{initials}</span>
              </div>
              <span className="text-xs text-white/80 truncate max-w-[90px]">{user.name.split(" ")[0]}</span>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-white/60 hover:text-white p-1"
                title="Sair"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </form>
          </div>
        </header>
        <div className="flex-1 p-3 sm:p-6 min-w-0">{children}</div>
      </main>
    </SidebarProvider>
  );
}
