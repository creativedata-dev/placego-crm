import { notFound } from "next/navigation";
import { db } from "@/db";
import { leadAssignments, leads, users, leadActivities, contactMessages, sdrAssignments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { NoteForm } from "./note-form";

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
    .select({ assignment: leadAssignments, lead: leads, brokerName: users.name })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .innerJoin(users, eq(leadAssignments.brokerId, users.id))
    .where(eq(leadAssignments.id, assignmentId))
    .limit(1);

  if (!row) notFound();

  const isAdmin = user.role === "admin_placego" || user.role === "sdr";
  if (!isAdmin && row.assignment.brokerId !== user.id) notFound();

  const { lead, assignment, brokerName } = row;

  // Buscar atividades do corretor
  const activities = await db
    .select({ activity: leadActivities, userName: users.name })
    .from(leadActivities)
    .innerJoin(users, eq(leadActivities.userId, users.id))
    .where(eq(leadActivities.leadAssignmentId, assignmentId))
    .orderBy(desc(leadActivities.createdAt));

  // Buscar notas do SDR (mensagens internas + nota do assignment)
  const [sdrAssignment] = await db
    .select({ assignment: sdrAssignments, sdrName: users.name })
    .from(sdrAssignments)
    .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
    .where(eq(sdrAssignments.contactId, lead.id))
    .orderBy(desc(sdrAssignments.assignedAt))
    .limit(1);

  // Mensagens de canal (WhatsApp, email) para contexto
  const messages = await db
    .select({ msg: contactMessages, sdrName: users.name })
    .from(contactMessages)
    .leftJoin(users, eq(contactMessages.sdrId, users.id))
    .where(and(eq(contactMessages.contactId, lead.id), eq(contactMessages.direction, "in")))
    .orderBy(desc(contactMessages.sentAt))
    .limit(5);

  const score = (lead.name && lead.name !== "Sem nome" ? 20 : 0)
    + (lead.phone ? 30 : 0) + (lead.email ? 20 : 0)
    + (lead.campaignId ? 15 : 0) + (lead.utmSource || lead.adName ? 15 : 0);

  // Timeline unificada: atividades do corretor + nota do SDR
  type TimelineItem =
    | { kind: "activity"; id: string; label: string; notes: string | null; userName: string; date: Date }
    | { kind: "sdr_note"; id: string; notes: string; sdrName: string | null; date: Date }
    | { kind: "message"; id: string; content: string; channel: string; sdrName: string | null; date: Date };

  const timeline: TimelineItem[] = [
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
    ...messages.map(({ msg, sdrName }) => ({
      kind: "message" as const,
      id: msg.id,
      content: msg.content,
      channel: msg.channel,
      sdrName: sdrName ?? null,
      date: new Date(msg.sentAt),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <p className="text-muted-foreground text-sm">{lead.email ?? lead.phone}</p>
        </div>
      </div>

      {/* Dados do lead */}
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
              <p className="font-medium">{lead.adName ?? lead.campaignId}</p>
            </div>
          )}
        </div>

        {assignment.lossReason && (
          <div>
            <p className="text-xs text-muted-foreground">Motivo da perda</p>
            <p className="text-sm text-red-600">{assignment.lossReason}</p>
          </div>
        )}
      </div>

      {/* Adicionar nota/atividade */}
      <NoteForm assignmentId={assignmentId} />

      {/* Timeline unificada */}
      {timeline.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Histórico</h2>
          <div className="space-y-2">
            {timeline.map((item) => {
              if (item.kind === "activity") {
                return (
                  <div key={item.id} className="flex gap-3 text-sm border rounded-lg p-3">
                    <span className="shrink-0 text-base">{item.label.split(" ")[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{item.label.split(" ").slice(1).join(" ")} · corretor</p>
                      {item.notes && <p className="text-sm mt-0.5 whitespace-pre-wrap">{item.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.userName} · {item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              }
              if (item.kind === "sdr_note") {
                return (
                  <div key={item.id} className="flex gap-3 text-sm border rounded-lg p-3 bg-blue-50/40">
                    <span className="shrink-0 text-base">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-600">Nota do SDR</p>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{item.notes}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.sdrName ?? "SDR"} · {item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              }
              // message
              return (
                <div key={item.id} className="flex gap-3 text-sm border rounded-lg p-3 bg-muted/30">
                  <span className="shrink-0 text-base">
                    {item.channel === "whatsapp" ? "💬" : item.channel === "email" ? "✉️" : "📨"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground capitalize">{item.channel} recebido</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap line-clamp-3">{item.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
