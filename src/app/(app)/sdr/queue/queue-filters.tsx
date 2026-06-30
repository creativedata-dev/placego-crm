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
  currentTag?: string;
  tenants: { id: string; name: string }[];
  sdrs: { id: string; name: string }[];
  tagsList: { id: string; name: string }[];
  isAdmin: boolean;
}

export function QueueFilters({
  currentStatus, currentOrigin, currentTenant, currentSdr, currentTag,
  tenants, sdrs, tagsList, isAdmin,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "status" && currentStatus) params.set("status", currentStatus);
    if (key !== "origin" && currentOrigin) params.set("origin", currentOrigin);
    if (key !== "tenant" && currentTenant) params.set("tenant", currentTenant);
    if (key !== "sdr" && currentSdr) params.set("sdr", currentSdr);
    if (key !== "tag" && currentTag) params.set("tag", currentTag);
    if (value) params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClass =
    "h-8 rounded-lg border border-input bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring cursor-pointer";

  return (
    <div className="flex gap-2 flex-wrap items-center">
      {/* Origem */}
      <select
        value={currentOrigin ?? ""}
        onChange={(e) => update("origin", e.target.value)}
        className={selectClass}
      >
        {ORIGINS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Empresa */}
      {tenants.length > 0 && (
        <select
          value={currentTenant ?? ""}
          onChange={(e) => update("tenant", e.target.value)}
          className={selectClass}
        >
          <option value="">Todas empresas</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      {/* Tag */}
      {tagsList.length > 0 && (
        <select
          value={currentTag ?? ""}
          onChange={(e) => update("tag", e.target.value)}
          className={selectClass}
        >
          <option value="">Todas tags</option>
          {tagsList.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      {/* SDR (admin) */}
      {isAdmin && sdrs.length > 0 && (
        <select
          value={currentSdr ?? ""}
          onChange={(e) => update("sdr", e.target.value)}
          className={selectClass}
        >
          <option value="">Todos SDRs</option>
          {sdrs.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
