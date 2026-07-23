import type { UserRole } from "./auth";

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin_placego: [
    { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { title: "Fila SDR", href: "/sdr/queue", icon: "ListChecks" },
    { title: "Contatos", href: "/contatos", icon: "ContactRound" },
    { title: "Usuários", href: "/users", icon: "Users" },
    { title: "Empresas", href: "/tenants", icon: "Building2" },
    { title: "Corretores", href: "/brokers", icon: "UserCheck" },
    { title: "Imóveis", href: "/properties", icon: "Home" },
    { title: "Pipeline", href: "/pipeline", icon: "Kanban" },
    { title: "Relatórios", href: "/reports", icon: "BarChart3" },
  ],
  sdr: [
    { title: "Fila de Leads", href: "/sdr/queue", icon: "ListChecks" },
    { title: "Contatos", href: "/contatos", icon: "ContactRound" },
    { title: "Dashboard SDR", href: "/sdr/dashboard", icon: "BarChart3" },
    { title: "Corretores", href: "/brokers", icon: "UserCheck" },
  ],
  corretor: [
    { title: "Meu Pipeline", href: "/pipeline", icon: "Kanban" },
  ],
  admin_tenant: [
    { title: "Dashboard", href: "/tenant/dashboard", icon: "LayoutDashboard" },
    { title: "Contatos", href: "/contatos", icon: "ContactRound" },
    { title: "Corretores", href: "/brokers", icon: "UserCheck" },
    { title: "Imóveis", href: "/properties", icon: "Home" },
    { title: "Pipeline", href: "/pipeline", icon: "Kanban" },
    { title: "Usuários", href: "/users", icon: "Users" },
  ],
  corretor_tenant: [
    { title: "Pipeline", href: "/pipeline", icon: "Kanban" },
  ],
};
