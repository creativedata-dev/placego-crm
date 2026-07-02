import { notFound } from "next/navigation";
import { db } from "@/db";
import { leadAssignments, leads, users, leadActivities, contactMessages, sdrAssignments, tenants } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { NoteForm } from "./note-form";
import { ContactTimeline } from "@/app/(app)/sdr/contacts/[id]/contact-timeline";
import { ContactReply } from "@/app/(app)/sdr/contacts/[id]/contact-reply";

const STATUS_LABELS: Record<string, string> = {
  new: "Novo", contacted: "Contatado", visiting: "Visita Agendada",
  proposal: "Proposta", won: "Ganho", lost: "Perdido",
};

const ORIGIN_LABELS: Record<string, string> = {
  meta_leadgen: "Lead Ads", meta_ads: "Meta Ads", meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM", meta_comment: "Comentário", whatsapp: "WhatsApp",
  email: "Email", lp: "Landing Page", indicacao: "Indicação", manual: "Manual", portal: "Portal",
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "📞 Ligação", whatsapp: "💬 WhatsApp", email: "✉️ Email",
  visit: "📍 Visita", note: "📝 Nota",
};

export default async function PipelineDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await requireRole(["corretor", "corretor_tenant", "admin_placego", "sdr"]);
  const { assignmentId } = await params;

  const [row] = await db
    .select({
      assignment: leadAssignments,
      lead: leads,
      brokerName: users.name,
      tenantSlug: tenants.slug,
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .innerJoin(users, eq(leadAssignments.brokerId, users.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .where(eq(leadAssignments.id, assignmentId))
    .limit(1);

  if (!row) notFound();

  const isAdmin = user.role === "admin_placego" || user.role === "sdr";
  if (!isAdmin && row.assignment.brokerId !== user.id) notFound();

  const { lead, assignment, brokerName, tenantSlug } = row;
  const instanceName = tenantSlug ? `placego-${tenantSlug}` : null;

  const [activities, allMessages, sdrAssignment] = await Promise.all([
    db
      .select({ activity: leadActivities, userName: users.name })
      .from(leadActivities)
      .innerJoin(users, eq(leadActivities.userId, users.id))
      .where(eq(leadActivities.leadAssignmentId, assignmentId))
      .orderBy(desc(leadActivities.createdAt)),
    db
      .select({ msg: contactMessages, sdrName: users.name })
      .from(contactMessages)
      .leftJoin(users, eq(contactMessages.sdrId, users.id))
      .where(eq(contactMessages.contactId, lead.id))
      .orderBy(contactMessages.sentAt),
    db
      .select({ assignment: sdrAssignments, sdrName: users.name })
      .from(sdrAssignments)
      .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
      .where(eq(sdrAssignments.contactId, lead.id))
      .orderBy(desc(sdrAssignments.assignedAt))
      .limit(1)
      .then((r) => r[0]),
  ]);

  const score = (lead.name && lead.name !== "Sem nome" ? 20 : 0)
    + (lead.phone ? 30 : 0) + (lead.email ? 20 : 0)
    + (lead.campaignId ? 15 : 0) + (lead.utmSource || lead.adName ? 15 : 0);

  // Timeline de atividades (notas do corretor + SDR) separada das mensagens de canal
  type ActivityItem =
    | { kind: "activity"; id: string; label: string; notes: string | null; userName: string; date: Date }
    | { kind: "sdr_note"; id: string; notes: string; sdrName: string | null; date: Date };

  const activityTimeline: ActivityItem[] = [
    ...activities.map(({ activity, userName }) => ({
      kind: "activity" as const,
      id: activity.id,
      label: ACTIVITY_LABELS[activity.type] ?? activity.type,
      notes: activity.notes,
      userName,
      date: new Date(activity.createdAt),
    })),
    ...(sdrAssignment?.assignment.notes
      ? [{
          kind: "sdr_note" as const,
          id: sdrAssignment.assignment.id,
          notes: sdrAssignment.assignment.notes,
          sdrName: sdrAssignment.sdrName ?? null,
          date: new Date(sdrAssignment.assignment.updatedAt),
        }]
      : []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const messages = allMessages.map(({ msg, sdrName }) => ({ ...msg, sdrName }));
  const defaultReplyChannel = lead.origin === "email" ? "email" : "whatsapp";

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <BackButton />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{lead.name}</h1>
            <Badge>{STATUS_LABELS[assignment.status] ?? assignment.status}</Badge>
            <Badge variant="outline">{ORIGIN_LABELS[lead.origin] ?? lead.origin}</Badge>
            <Badge variant="outline">Score: {score}</Badge>
            {isAdmin && <Badge variant="outline">Corretor: {brokerName}</Badge>}
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            {lead.phone && <span>📞 {lead.phone}</span>}
            {lead.email && <span>✉️ {lead.email}</span>}
            {lead.adName && <span>📢 {lead.adName}</span>}
          </div>
        </div>
      </div>

      {assignment.lossReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          Motivo da perda: {assignment.lossReason}
        </div>
      )}

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversa — 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conversa</h2>
          <ContactTimeline messages={messages} origin={lead.origin} />
          <ContactReply
            contactId={lead.id}
            contactPhone={lead.phone}
            contactEmail={lead.email}
            contactName={lead.name}
            defaultChannel={defaultReplyChannel}
            tenantSlug={instanceName}
          />
        </div>

        {/* Painel lateral — 1/3 */}
        <div className="space-y-4">
          {/* Registrar atividade */}
          <NoteForm assignmentId={assignmentId} />

          {/* Histórico de atividades */}
          {activityTimeline.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Atividades</h2>
              <div className="space-y-2">
                {activityTimeline.map((item) => {
                  if (item.kind === "activity") {
                    return (
                      <div key={item.id} className="flex gap-2.5 text-sm border rounded-lg p-3">
                        <span className="shrink-0">{item.label.split(" ")[0]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">
                            {item.label.split(" ").slice(1).join(" ")}
                          </p>
                          {item.notes && <p className="text-sm mt-0.5 whitespace-pre-wrap">{item.notes}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.userName} · {item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={item.id} className="flex gap-2.5 text-sm border rounded-lg p-3 bg-blue-50/40">
                      <span className="shrink-0">📋</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-600">Nota do SDR</p>
                        <p className="text-sm mt-0.5 whitespace-pre-wrap">{item.notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.sdrName ?? "SDR"} · {item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
