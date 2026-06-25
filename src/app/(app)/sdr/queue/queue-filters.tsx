"use client";

import { useRouter, usePathname } from "next/navigation";

const STATUSES = [
  { value: "", label: "Ativos" },
  { value: "new", label: "Novos" },
  { value: "waiting", label: "Aguardando" },
  { value: "qualified", label: "Qualificados" },
  { value: "invalid", label: "Inválidos" },
  { value: "duplicate", label: "Duplicados" },
];

const ORIGINS = [
  { value: "", label: "Todas origens" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "lp", label: "Landing Page" },
  { value: "manual", label: "Manual" },
  { value: "portal", label: "Portal" },
];

interface Props {
  currentStatus?: string;
  currentOrigin?: string;
  currentTenant?: string;
  tenants: { id: string; name: string }[];
}

export function QueueFilters({ currentStatus, currentOrigin, currentTenant, tenants }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && currentStatus) params.set("status", currentStatus);
    if (key !== "origin" && currentOrigin) params.set("origin", currentOrigin);
    if (key !== "tenant" && currentTenant) params.set("tenant", currentTenant);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const pillBase = "text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer";
  const pillActive = "bg-primary text-primary-foreground border-primary";
  const pillInactive = "bg-background border-border hover:bg-muted";

  return (
    <div className="space-y-2">
      {/* Status */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => update("status", s.value)}
            className={`${pillBase} ${(currentStatus ?? "") === s.value ? pillActive : pillInactive}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Origem + Tenant */}
      <div className="flex gap-1.5 flex-wrap">
        {ORIGINS.map((o) => (
          <button
            key={o.value}
            onClick={() => update("origin", o.value)}
            className={`${pillBase} ${(currentOrigin ?? "") === o.value ? "bg-blue-600 text-white border-blue-600" : pillInactive}`}
          >
            {o.label}
          </button>
        ))}

        {tenants.length > 0 && (
          <>
            <span className="text-muted-foreground text-xs self-center px-1">|</span>
            <button
              onClick={() => update("tenant", "")}
              className={`${pillBase} ${!currentTenant ? "bg-secondary text-secondary-foreground border-secondary" : pillInactive}`}
            >
              Todos BMs
            </button>
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => update("tenant", t.id)}
                className={`${pillBase} ${currentTenant === t.id ? "bg-secondary text-secondary-foreground border-secondary" : pillInactive}`}
              >
                {t.name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
