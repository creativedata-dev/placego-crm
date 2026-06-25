"use client";

import { useRouter, usePathname } from "next/navigation";

const ORIGINS = [
  { value: "", label: "Todas origens" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meta_dm_instagram", label: "Instagram DM" },
  { value: "meta_dm_facebook", label: "Facebook DM" },
  { value: "meta_leadgen", label: "Lead Ads" },
  { value: "email", label: "Email" },
  { value: "indicacao", label: "Indicação" },
  { value: "manual", label: "Manual" },
  { value: "portal", label: "Portal" },
];

interface Props {
  currentStatus?: string;
  currentOrigin?: string;
  currentTenant?: string;
  currentSdr?: string;
  tenants: { id: string; name: string }[];
  sdrs: { id: string; name: string }[];
  isAdmin: boolean;
}

export function QueueFilters({
  currentStatus, currentOrigin, currentTenant, currentSdr,
  tenants, sdrs, isAdmin,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && currentStatus) params.set("status", currentStatus);
    if (key !== "origin" && currentOrigin) params.set("origin", currentOrigin);
    if (key !== "tenant" && currentTenant) params.set("tenant", currentTenant);
    if (key !== "sdr" && currentSdr) params.set("sdr", currentSdr);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const pill = (active: boolean, secondary = false) =>
    `text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
      active
        ? secondary
          ? "bg-secondary text-secondary-foreground border-secondary"
          : "bg-blue-600 text-white border-blue-600"
        : "bg-background border-border hover:bg-muted"
    }`;

  return (
    <div className="space-y-2">
      {/* Origens */}
      <div className="flex gap-1.5 flex-wrap">
        {ORIGINS.map((o) => (
          <button
            key={o.value}
            onClick={() => update("origin", o.value)}
            className={pill((currentOrigin ?? "") === o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Empresas + SDRs (admin) */}
      {(tenants.length > 0 || (isAdmin && sdrs.length > 0)) && (
        <div className="flex gap-1.5 flex-wrap items-center">
          {tenants.length > 0 && (
            <>
              <button onClick={() => update("tenant", "")} className={pill(!currentTenant, true)}>
                Todas empresas
              </button>
              {tenants.map((t) => (
                <button key={t.id} onClick={() => update("tenant", t.id)} className={pill(currentTenant === t.id, true)}>
                  {t.name}
                </button>
              ))}
            </>
          )}

          {isAdmin && sdrs.length > 0 && (
            <>
              <span className="text-muted-foreground text-xs self-center px-1">|</span>
              <button onClick={() => update("sdr", "")} className={pill(!currentSdr, true)}>
                Todos SDRs
              </button>
              {sdrs.map((s) => (
                <button key={s.id} onClick={() => update("sdr", s.id)} className={pill(currentSdr === s.id, true)}>
                  {s.name}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
