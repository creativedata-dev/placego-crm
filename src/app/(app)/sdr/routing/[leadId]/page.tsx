import { notFound } from "next/navigation";
import { db } from "@/db";
import { leads, properties, developments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { scoreBrokersForLead } from "@/lib/routing-engine";
import { RoutingClient } from "./routing-client";

export default async function LeadRoutingPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  await requireRole(["sdr", "admin_placego"]);
  const { leadId } = await params;

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) notFound();

  const [sourceProperty] = lead.sourcePropertyId
    ? await db.select().from(properties).where(eq(properties.id, lead.sourcePropertyId)).limit(1)
    : [null];

  const [sourceDevelopment] = lead.sourceDevelopmentId
    ? await db.select().from(developments).where(eq(developments.id, lead.sourceDevelopmentId)).limit(1)
    : [null];

  const brokerMatches = await scoreBrokersForLead(leadId);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Distribuição de Lead</h1>
        <p className="text-muted-foreground text-sm">
          Selecione um ou mais corretores para receber este lead
        </p>
      </div>

      {/* Card do lead */}
      <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-lg">{lead.name}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{lead.phone}</span>
              {lead.email && <span>{lead.email}</span>}
            </div>
          </div>
          <div className="ml-auto text-right">
            <span
              className={`text-2xl font-bold ${
                (lead.qualityScore ?? 0) >= 70
                  ? "text-green-600"
                  : (lead.qualityScore ?? 0) >= 40
                  ? "text-yellow-600"
                  : "text-red-500"
              }`}
            >
              {lead.qualityScore ?? 0}
            </span>
            <p className="text-xs text-muted-foreground">score</p>
          </div>
        </div>

        {(sourceProperty || sourceDevelopment) && (
          <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
            {sourceProperty && (
              <span>
                📍 {sourceProperty.address}, {sourceProperty.neighborhood} — {sourceProperty.city}
                {sourceProperty.price && (
                  <> · {Number(sourceProperty.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</>
                )}
              </span>
            )}
            {sourceDevelopment && (
              <span>
                🏗️ {sourceDevelopment.name} — {sourceDevelopment.city}
              </span>
            )}
          </div>
        )}

        {lead.utmCampaign && (
          <p className="text-xs text-muted-foreground">Campanha: {lead.utmCampaign}</p>
        )}
      </div>

      <RoutingClient leadId={leadId} brokerMatches={brokerMatches} />
    </div>
  );
}
