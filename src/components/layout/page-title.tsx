"use client";

import { usePathname } from "next/navigation";

const TITLE_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sdr/queue": "Fila SDR",
  "/sdr/dashboard": "Dashboard SDR",
  "/sdr/routing": "Distribuição",
  "/sdr/contacts": "Contato",
  "/contatos": "Contatos",
  "/users": "Usuários",
  "/tenants": "Empresas",
  "/brokers": "Corretores",
  "/properties": "Imóveis",
  "/pipeline": "Pipeline",
  "/reports": "Relatórios",
  "/tenant/dashboard": "Dashboard",
};

export function PageTitle() {
  const pathname = usePathname();

  const title = Object.entries(TITLE_MAP)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname === path || pathname.startsWith(path + "/"))?.[1] ?? "PlaceGo CRM";

  return <span className="text-sm font-semibold text-white/90 sm:text-foreground truncate">{title}</span>;
}
