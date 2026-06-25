import { db } from "@/db";
import { leads, properties, developments } from "@/db/schema";
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
  searchParams: Promise<{ status?: string; origin?: string }>;
}) {
  await requireRole(["sdr", "admin_placego"]);
  const { status, origin } = await searchParams;

  const activeStatuses = status
    ? [status]
    : ["new", "waiting"];

  const rows = await db
    .select({
      lead: leads,
      propertyAddress: properties.address,
      propertyNeighborhood: properties.neighborhood,
      developmentName: developments.name,
    })
    .from(leads)
    .leftJoin(properties, eq(leads.sourcePropertyId, properties.id))
    .leftJoin(developments, eq(leads.sourceDevelopmentId, developments.id))
    .where(inArray(leads.status, activeStatuses as any[]))
    .orderBy(desc(leads.createdAt));

  const filtered = origin
    ? rows.filter((r) => r.lead.origin === origin)
    : rows;

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

      <QueueFilters currentStatus={status} currentOrigin={origin} />

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border rounded-lg">
            Nenhum lead na fila com os filtros selecionados.
          </div>
        )}

        {filtered.map(({ lead, propertyAddress, propertyNeighborhood, developmentName }) => {
          const source = developmentName
            ? developmentName
            : propertyAddress
            ? `${propertyAddress}${propertyNeighborhood ? ` — ${propertyNeighborhood}` : ""}`
            : null;

          const age = Math.floor(
            (Date.now() - new Date(lead.createdAt).getTime()) / 60000
          );
          const ageLabel =
            age < 60
              ? `${age}min atrás`
              : age < 1440
              ? `${Math.floor(age / 60)}h atrás`
              : `${Math.floor(age / 1440)}d atrás`;

          return (
            <div
              key={lead.id}
              className="flex items-start gap-4 p-4 bg-background border rounded-lg hover:bg-muted/30 transition-colors"
            >
              {/* Score */}
              <div className="flex flex-col items-center min-w-[48px]">
                <span
                  className={`text-lg font-bold ${
                    (lead.qualityScore ?? 0) >= 70
                      ? "text-green-600"
                      : (lead.qualityScore ?? 0) >= 40
                      ? "text-yellow-600"
                      : "text-red-500"
                  }`}
                >
                  {lead.qualityScore ?? 0}
                </span>
                <span className="text-[10px] text-muted-foreground">score</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{lead.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[lead.status]}`}
                  >
                    {STATUS_LABELS[lead.status]}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {ORIGIN_LABELS[lead.origin] ?? lead.origin}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span>{lead.phone}</span>
                  {lead.email && <span>{lead.email}</span>}
                  {source && <span className="truncate max-w-[240px]">📍 {source}</span>}
                </div>
                {lead.utmCampaign && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Campanha: {lead.utmCampaign}
                  </p>
                )}
              </div>

              {/* Tempo */}
              <span className="text-xs text-muted-foreground whitespace-nowrap">{ageLabel}</span>

              {/* Ações */}
              <LeadQueueActions leadId={lead.id} currentStatus={lead.status} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
