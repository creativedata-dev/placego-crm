import { db } from "@/db";
import { leads, properties, developments, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, inArray, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { LeadQueueActions } from "./lead-queue-actions";
import { QueueFilters } from "./queue-filters";
import { AddLeadButton } from "./add-lead-button";
import { ScoreBadge } from "./score-badge";

const ORIGIN_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  lp: "Landing Page",
  manual: "Manual",
  portal: "Portal",
};

const ORIGIN_COLORS: Record<string, string> = {
  meta_ads: "bg-blue-500/10 text-blue-700 border-blue-200",
  lp: "bg-purple-500/10 text-purple-700 border-purple-200",
  manual: "bg-gray-500/10 text-gray-700 border-gray-200",
  portal: "bg-orange-500/10 text-orange-700 border-orange-200",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Novos",
  waiting: "Aguardando",
  qualified: "Qualificados",
  invalid: "Inválidos",
  duplicate: "Duplicados",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 border-blue-200",
  waiting: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  qualified: "bg-green-500/10 text-green-700 border-green-200",
  invalid: "bg-red-500/10 text-red-700 border-red-200",
  duplicate: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const STATUS_ORDER = ["new", "waiting", "qualified", "invalid", "duplicate"];

export default async function SDRQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; origin?: string; tenant?: string }>;
}) {
  await requireRole(["sdr", "admin_placego"]);
  const { status, origin, tenant: tenantFilter } = await searchParams;

  // Buscar todos os leads ativos (todos os status)
  const allRows = await db
    .select({
      lead: leads,
      propertyAddress: properties.address,
      propertyNeighborhood: properties.neighborhood,
      developmentName: developments.name,
      tenantName: tenants.name,
    })
    .from(leads)
    .leftJoin(properties, eq(leads.sourcePropertyId, properties.id))
    .leftJoin(developments, eq(leads.sourceDevelopmentId, developments.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .orderBy(desc(leads.createdAt));

  // Contadores por status (para os pills do kanban)
  const counts: Record<string, number> = {};
  for (const s of STATUS_ORDER) {
    counts[s] = allRows.filter((r) => r.lead.status === s).length;
  }

  // Filtrar para exibição
  const activeStatus = status ?? "new";
  const filtered = allRows.filter((r) => {
    if (r.lead.status !== activeStatus) return false;
    if (origin && r.lead.origin !== origin) return false;
    if (tenantFilter && r.lead.tenantId !== tenantFilter) return false;
    return true;
  });

  // Lista de empresas para filtro
  const tenantList = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fila SDR</h1>
          <p className="text-muted-foreground text-sm">Validação e distribuição de leads</p>
        </div>
        <AddLeadButton />
      </div>

      {/* Kanban de status — contadores clicáveis */}
      <div className="grid grid-cols-5 gap-2">
        {STATUS_ORDER.map((s) => (
          <a
            key={s}
            href={`/sdr/queue?status=${s}${origin ? `&origin=${origin}` : ""}${tenantFilter ? `&tenant=${tenantFilter}` : ""}`}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-sm ${
              activeStatus === s
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <span className={`text-2xl font-bold ${
              activeStatus === s ? "text-primary" :
              s === "new" ? "text-blue-600" :
              s === "waiting" ? "text-yellow-600" :
              s === "qualified" ? "text-green-600" :
              s === "invalid" ? "text-red-500" :
              "text-gray-500"
            }`}>
              {counts[s]}
            </span>
            <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
              {STATUS_LABELS[s]}
            </span>
          </a>
        ))}
      </div>

      {/* Filtros secundários */}
      <QueueFilters
        currentStatus={activeStatus}
        currentOrigin={origin}
        currentTenant={tenantFilter}
        tenants={tenantList}
      />

      {/* Lista de leads */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/20">
            <p className="font-medium">Nenhum lead em "{STATUS_LABELS[activeStatus]}"</p>
            <p className="text-sm mt-1">Tente outro filtro ou aguarde novos leads chegarem.</p>
          </div>
        )}

        {filtered.map(({ lead, propertyAddress, propertyNeighborhood, developmentName, tenantName }) => {
          const source = developmentName
            ? developmentName
            : propertyAddress
            ? `${propertyAddress}${propertyNeighborhood ? ` — ${propertyNeighborhood}` : ""}`
            : null;

          const age = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
          const ageLabel =
            age < 60 ? `${age}min` : age < 1440 ? `${Math.floor(age / 60)}h` : `${Math.floor(age / 1440)}d`;

          return (
            <div
              key={lead.id}
              className="flex items-start gap-3 p-4 bg-background border rounded-xl hover:shadow-sm transition-all"
            >
              {/* Score com tooltip */}
              <ScoreBadge score={lead.qualityScore ?? 0} />

              {/* Info principal */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Linha 1: nome + origem */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{lead.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORIGIN_COLORS[lead.origin] ?? ORIGIN_COLORS.manual}`}>
                    {ORIGIN_LABELS[lead.origin] ?? lead.origin}
                  </span>
                </div>

                {/* Linha 2: contato */}
                <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono">{lead.phone}</span>
                  {lead.email && <span>{lead.email}</span>}
                </div>

                {/* Linha 3: empresa, campanha, imóvel */}
                <div className="flex gap-2 flex-wrap items-center">
                  {tenantName && (
                    <Badge variant="secondary" className="text-xs">
                      🏢 {tenantName}
                    </Badge>
                  )}
                  {(lead.adName ?? lead.utmCampaign ?? lead.campaignId) && (
                    <Badge variant="outline" className="text-xs">
                      📣 {lead.adName ?? lead.utmCampaign ?? `ID: ${lead.campaignId}`}
                    </Badge>
                  )}
                  {lead.adsetName && (
                    <span className="text-xs text-muted-foreground">
                      {lead.adsetName}
                    </span>
                  )}
                  {source && (
                    <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                      📍 {source}
                    </span>
                  )}
                </div>
              </div>

              {/* Tempo */}
              <span className="text-xs text-muted-foreground whitespace-nowrap pt-1 shrink-0">
                {ageLabel} atrás
              </span>

              {/* Ações */}
              <LeadQueueActions leadId={lead.id} currentStatus={lead.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
