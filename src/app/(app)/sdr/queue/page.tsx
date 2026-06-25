import { db } from "@/db";
import { leads, properties, developments, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, inArray, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { LeadQueueActions } from "./lead-queue-actions";
import { QueueFilters } from "./queue-filters";
import { AddLeadButton } from "./add-lead-button";

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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-700 border-blue-200",
  waiting: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  qualified: "bg-green-500/10 text-green-700 border-green-200",
  invalid: "bg-red-500/10 text-red-700 border-red-200",
  duplicate: "bg-gray-500/10 text-gray-600 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  waiting: "Aguardando",
  qualified: "Qualificado",
  invalid: "Inválido",
  duplicate: "Duplicado",
};

export default async function SDRQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; origin?: string; tenant?: string }>;
}) {
  await requireRole(["sdr", "admin_placego"]);
  const { status, origin, tenant: tenantFilter } = await searchParams;

  const activeStatuses = status ? [status] : ["new", "waiting"];

  const rows = await db
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
    .where(inArray(leads.status, activeStatuses as any[]))
    .orderBy(desc(leads.createdAt));

  const filtered = rows.filter((r) => {
    if (origin && r.lead.origin !== origin) return false;
    if (tenantFilter && r.lead.tenantId !== tenantFilter) return false;
    return true;
  });

  // Lista de tenants para filtro
  const tenantList = await db.select({ id: tenants.id, name: tenants.name }).from(tenants);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fila SDR</h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""} na fila
          </p>
        </div>
        <AddLeadButton />
      </div>

      <QueueFilters
        currentStatus={status}
        currentOrigin={origin}
        currentTenant={tenantFilter}
        tenants={tenantList}
      />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            Nenhum lead na fila com os filtros selecionados.
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
              className="flex items-start gap-3 p-4 bg-background border rounded-lg hover:bg-muted/30 transition-colors"
            >
              {/* Score */}
              <div className="flex flex-col items-center min-w-[44px] pt-0.5">
                <span className={`text-lg font-bold leading-none ${
                  (lead.qualityScore ?? 0) >= 70 ? "text-green-600"
                  : (lead.qualityScore ?? 0) >= 40 ? "text-yellow-600"
                  : "text-red-500"
                }`}>
                  {lead.qualityScore ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground">score</span>
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Linha 1: nome + status + origem */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{lead.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORIGIN_COLORS[lead.origin] ?? ORIGIN_COLORS.manual}`}>
                    {ORIGIN_LABELS[lead.origin] ?? lead.origin}
                  </span>
                </div>

                {/* Linha 2: contato */}
                <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono">{lead.phone}</span>
                  {lead.email && <span>{lead.email}</span>}
                </div>

                {/* Linha 3: origem do lead (BM/tenant, campanha, imóvel) */}
                <div className="flex gap-2 flex-wrap items-center">
                  {tenantName && (
                    <Badge variant="secondary" className="text-xs font-medium">
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
                      Conjunto: {lead.adsetName}
                    </span>
                  )}
                  {lead.formName && (
                    <span className="text-xs text-muted-foreground">
                      Formulário: {lead.formName}
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
              <span className="text-xs text-muted-foreground whitespace-nowrap pt-1">{ageLabel} atrás</span>

              {/* Ações */}
              <LeadQueueActions leadId={lead.id} currentStatus={lead.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
