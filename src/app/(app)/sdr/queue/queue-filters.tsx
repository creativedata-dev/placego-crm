"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const STATUSES = [
  { value: "", label: "Ativos (novo + aguardando)" },
  { value: "new", label: "Novos" },
  { value: "waiting", label: "Aguardando" },
  { value: "qualified", label: "Qualificados" },
  { value: "invalid", label: "Inválidos" },
  { value: "duplicate", label: "Duplicados" },
];

const ORIGINS = [
  { value: "", label: "Todas as origens" },
  { value: "meta_ads", label: "Meta Ads" },
  { value: "lp", label: "Landing Page" },
  { value: "manual", label: "Manual" },
  { value: "portal", label: "Portal" },
];

export function QueueFilters({
  currentStatus,
  currentOrigin,
}: {
  currentStatus?: string;
  currentOrigin?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && currentStatus) params.set("status", currentStatus);
    if (key !== "origin" && currentOrigin) params.set("origin", currentOrigin);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex gap-1 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => update("status", s.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              (currentStatus ?? "") === s.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap">
        {ORIGINS.map((o) => (
          <button
            key={o.value}
            onClick={() => update("origin", o.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              (currentOrigin ?? "") === o.value
                ? "bg-secondary text-secondary-foreground border-secondary"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
