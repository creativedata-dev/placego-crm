import { notFound } from "next/navigation";
import { db } from "@/db";
import { leadAssignments, leads, users, leadActivities, contactMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { ActivityForm } from "./activity-form";

const STATUS_LABELS: Record<string, string> = {
  new: "Novo", contacted: "Contatado", visiting: "Visita Agendada",
  proposal: "Proposta", won: "Ganho", lost: "Perdido",
};

const ORIGIN_LABELS: Record<string, string> = {
  meta_leadgen: "Lead Ads", meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM", whatsapp: "WhatsApp",
  email: "Email", lp: "Landing Page", indicacao: "Indicação",
  manual: "Manual", portal: "Portal",
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "📞 Ligação", whatsapp: "💬 WhatsApp", email: "✉️ Email",
  visit: "📍 Visita", note: "📝 Anotação",
};

export default async function PipelineDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const user = await requireRole(["corretor", "corretor_tenant", "admin_placego", "sdr"]);
  const { assignmentId } = await params;

  const [row] = await db
    .select({
      assignment: leadAssignments,
      lead: leads,
      brokerName: users.name,
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .innerJoin(users, eq(leadAssignments.brokerId, users.id))
    .where(eq(leadAssignments.id, assignmentId))
    .limit(1);

  if (!row) notFound();

  const isAdmin = user.role === "admin_placego" || user.role === "sdr";
  if (!isAdmin && row.assignment.brokerId !== user.id) notFound();

  const [activities, messages] = await Promise.all([
    db
      .select({ activity: leadActivities, userName: users.name })
      .from(leadActivities)
      .innerJoin(users, eq(leadActivities.userId, users.id))
      .where(eq(leadActivities.leadAssignmentId, assignmentId))
      .orderBy(desc(leadActivities.createdAt)),
    db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.contactId, row.lead.id))
      .orderBy(desc(contactMessages.sentAt))
      .limit(10),
  ]);

  const { lead, assignment, brokerName } = row;
  const score = (lead.name && lead.name !== "Sem nome" ? 20 : 0)
    + (lead.phone ? 30 : 0) + (lead.email ? 20 : 0)
    + (lead.campaignId ? 15 : 0) + (lead.utmSource || lead.adName ? 15 : 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <p className="text-muted-foreground text-sm">{lead.email ?? lead.phone}</p>
        </div>
      </div>

      {/* Status + info */}
      <div className="rounded-xl border p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge>{STATUS_LABELS[assignment.status] ?? assignment.status}</Badge>
          <Badge variant="outline">{ORIGIN_LABELS[lead.origin] ?? lead.origin}</Badge>
          <Badge variant="outline">Score: {score}</Badge>
          {isAdmin && <Badge variant="outline">Corretor: {brokerName}</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {lead.phone && (
            <div>
              <p className="text-xs text-muted-foreground">Telefone</p>
              <p className="font-medium">{lead.phone}</p>
            </div>
          )}
          {lead.email && (
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{lead.email}</p>
            </div>
          )}
          {lead.campaignId && (
            <div>
              <p className="text-xs text-muted-foreground">Campanha</p>
              <p className="font-medium">{lead.campaignId}</p>
            </div>
          )}
          {lead.adName && (
            <div>
              <p className="text-xs text-muted-foreground">Anúncio</p>
              <p className="font-medium">{lead.adName}</p>
            </div>
          )}
        </div>

        {lead.notes && (
          <div>
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {assignment.lossReason && (
          <div>
            <p className="text-xs text-muted-foreground">Motivo da perda</p>
            <p className="text-sm text-red-600">{assignment.lossReason}</p>
          </div>
        )}
      </div>

      {/* Registrar atividade */}
      <ActivityForm assignmentId={assignmentId} />

      {/* Timeline de atividades */}
      {activities.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico</h2>
          <div className="space-y-2">
            {activities.map(({ activity, userName }) => (
              <div key={activity.id} className="flex gap-3 text-sm border rounded-lg p-3">
                <span className="shrink-0">{ACTIVITY_LABELS[activity.type] ?? activity.type}</span>
                <div className="flex-1 min-w-0">
                  {activity.notes && <p className="text-sm">{activity.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {userName} · {new Date(activity.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimas mensagens */}
      {messages.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Últimas mensagens</h2>
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`text-sm rounded-lg p-3 max-w-[85%] ${
                  msg.direction === "out"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.direction === "out" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(msg.sentAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
