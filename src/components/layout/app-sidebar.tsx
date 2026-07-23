"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  Home,
  BarChart3,
  Settings,
  ListChecks,
  Share2,
  Kanban,
  ContactRound,
  Plug,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/lib/navigation";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  Home,
  BarChart3,
  Settings,
  ListChecks,
  Share2,
  Kanban,
  ContactRound,
  Plug,
};

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  navItems: NavItem[];
  tenantName?: string | null;
}

export function AppSidebar({ user, navItems, tenantName }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-xs font-black text-white">PG</span>
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base tracking-tight text-sidebar-foreground block leading-tight">
              PlaceGo CRM
            </span>
            {tenantName && (
              <span className="text-[11px] text-sidebar-foreground/60 block truncate leading-tight">
                {tenantName}
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = ICONS[item.icon] ?? Home;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => { setOpenMobile(false); router.push(item.href); }}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
            <span className="text-xs text-sidebar-foreground/50 mt-0.5">
              {user.role === "admin_tenant" && tenantName
                ? `Administrador · ${tenantName}`
                : ({ admin_placego: "Admin PlaceGo", sdr: "SDR", corretor: "Corretor", admin_tenant: "Administrador", corretor_tenant: "Corretor Empresa" } as Record<string,string>)[user.role] ?? user.role}
            </span>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
