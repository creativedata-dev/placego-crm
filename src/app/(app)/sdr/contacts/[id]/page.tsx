import { notFound } from "next/navigation";
import { db } from "@/db";
import { leads, sdrAssignments, contactMessages, users, tenants, properties, tags, contactTags } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { ContactTimeline } from "./contact-timeline";
import { ContactReply } from "./contact-reply";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { ContactStatusActions } from "./contact-status-actions";
import { TagPicker } from "@/components/tags/tag-picker";

const ORIGIN_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM",
  meta_comment: "Comentário",
  email: "Email",
  meta_leadgen: "Lead Ads",
  lp: "Landing Page",
  indicacao: "Indicação",
  manual: "Manual",
  portal: "Portal",
};

const ORIGIN_ICONS: Record<string, string> = {
  whatsapp: "💬",
  meta_dm_instagram: "📸",
  meta_dm_facebook: "📘",
  meta_comment: "🗨️",
  email: "✉️",
  meta_leadgen: "📋",
  lp: "🌐",
  indicacao: "🤝",
  manual: "📝",
  portal: "🏠",
};

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  aguardando: "Aguardando",
  qualificado: "Qualificado",
  invalido: "Inválido",
};

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(["sdr", "admin_placego"]);
  const { id } = await params;

  // Buscar contato com dados relacionados
  const [contact] = await db
    .select({
      contact: leads,
      tenantName: tenants.name,
      propertyAddress: properties.address,
    })
    .from(leads)
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .leftJoin(properties, eq(leads.sourcePropertyId, properties.id))
    .where(eq(leads.id, id))
    .limit(1);

  if (!contact) notFound();

  // Buscar assignment do SDR
  const [assignment] = await db
    .select({ assignment: sdrAssignments, sdrName: users.name })
    .from(sdrAssignments)
    .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
    .where(eq(sdrAssignments.contactId, id))
    .orderBy(desc(sdrAssignments.assignedAt))
    .limit(1);

  // Buscar mensagens (timeline)
  const messages = await db
    .select({ msg: contactMessages, sdrName: users.name })
    .from(contactMessages)
    .leftJoin(users, eq(contactMessages.sdrId, users.id))
    .where(eq(contactMessages.contactId, id))
    .orderBy(contactMessages.sentAt);

  // Buscar tags do contato
  const contactTagRows = await db
    .select({ tag: tags })
    .from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, id));

  const { contact: c, tenantName, propertyAddress } = contact;
  const assignmentStatus = assignment?.assignment.status ?? "novo";
  const scoreColor = (c.qualityScore ?? 0) >= 70 ? "text-green-600" : (c.qualityScore ?? 0) >= 40 ? "text-yellow-600" : "text-red-500";

  // Canal de resposta padrão baseado na origem
  const defaultReplyChannel = c.origin === "email" ? "email" : "whatsapp";

  return (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <BackButton label="← Fila" />
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{c.name}</h1>
            <Badge variant="outline" className="text-xs">
              {ORIGIN_ICONS[c.origin]} {ORIGIN_LABELS[c.origin] ?? c.origin}
            </Badge>
            <span className={`text-sm font-semibold ${scoreColor}`}>
              Score {c.qualityScore ?? 0}
            </span>
          </div>
          <div className="flex gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
            {c.phone && <span>📞 {c.phone}</span>}
            {c.email && <span>✉️ {c.email}</span>}
            {tenantName && <span>🏢 {tenantName}</span>}
            {propertyAddress && <span>📍 {propertyAddress}</span>}
          </div>
          <div className="mt-2">
            <TagPicker contactId={id} initialTags={contactTagRows.map((r) => r.tag)} />
          </div>
        </div>

        {/* Ações de status */}
        {assignment && (
          <ContactStatusActions
            assignmentId={assignment.assignment.id}
            contactId={id}
            currentStatus={assignmentStatus}
          />
        )}
      </div>

      {/* Info rápida */}
      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span>SDR: <strong>{assignment?.sdrName ?? "—"}</strong></span>
        <span>Status: <strong>{STATUS_LABELS[assignmentStatus]}</strong></span>
        <span>Entrou: <strong>{new Date(c.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</strong></span>
        {c.adName && <span>Campanha: <strong>{c.adName}</strong></span>}
        {c.notes && <span>Obs: <strong>{c.notes}</strong></span>}
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timeline — 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conversa</h2>
          <ContactTimeline messages={messages.map((m) => ({ ...m.msg, sdrName: m.sdrName }))} origin={c.origin} />

          {/* Interface de resposta */}
          <ContactReply
            contactId={id}
            contactPhone={c.phone}
            contactEmail={c.email}
            contactName={c.name}
            defaultChannel={defaultReplyChannel}
            tenantSlug={tenantName ? `placego-${tenantName.toLowerCase().replace(/\s+/g, "-")}` : null}
          />
        </div>

        {/* Painel lateral — 1/3 */}
        <div className="space-y-4">
          <div className="border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold">Dados do contato</h3>
            <div className="space-y-2 text-sm">
              {c.phone && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Telefone</span>
                  <span className="font-medium">{c.phone}</span>
                </div>
              )}
              {c.email && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Email</span>
                  <span className="font-medium truncate">{c.email}</span>
                </div>
              )}
              {tenantName && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Empresa</span>
                  <span className="font-medium">{tenantName}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-muted-foreground w-16 shrink-0">Origem</span>
                <span className="font-medium">{ORIGIN_ICONS[c.origin]} {ORIGIN_LABELS[c.origin]}</span>
              </div>
              {c.campaignId && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Campanha</span>
                  <span className="font-medium truncate">{c.adName ?? c.campaignId}</span>
                </div>
              )}
              {c.adsetName && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Conjunto</span>
                  <span className="font-medium">{c.adsetName}</span>
                </div>
              )}
              {c.formName && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16 shrink-0">Formulário</span>
                  <span className="font-medium">{c.formName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Score detalhado */}
          <div className="border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold">Score de qualidade</h3>
            <div className="flex items-end gap-2">
              <span className={`text-3xl font-bold ${scoreColor}`}>{c.qualityScore ?? 0}</span>
              <span className="text-muted-foreground text-sm mb-1">/ 100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${(c.qualityScore ?? 0) >= 70 ? "bg-green-500" : (c.qualityScore ?? 0) >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                style={{ width: `${c.qualityScore ?? 0}%` }}
              />
            </div>
            <div className="space-y-1 pt-1">
              {[
                { label: "Nome", pts: 20, ok: !!c.name && c.name !== "Sem nome" },
                { label: "Telefone", pts: 30, ok: !!c.phone },
                { label: "Email", pts: 20, ok: !!c.email },
                { label: "Campanha", pts: 15, ok: !!c.campaignId },
                { label: "UTM / Anúncio", pts: 15, ok: !!c.utmSource || !!c.adName },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className={item.ok ? "text-foreground" : "text-muted-foreground line-through"}>{item.label}</span>
                  <span className={item.ok ? "text-green-600 font-medium" : "text-muted-foreground"}>+{item.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
