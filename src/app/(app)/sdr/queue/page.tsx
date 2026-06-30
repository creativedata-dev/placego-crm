import { db } from "@/db";
import { leads, sdrAssignments, properties, tenants, users, tags, contactTags } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, desc, and, inArray } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { SdrQueueActions } from "./sdr-queue-actions";
import { QueueFilters } from "./queue-filters";
import { AddContactButton } from "./add-contact-button";
import { ScoreBadge } from "./score-badge";
import { TagPicker } from "@/components/tags/tag-picker";

const ORIGIN_LABELS: Record<string, string> = {
  meta_leadgen: "Lead Ads",
  meta_ads: "Meta Ads",
  meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM",
  meta_comment: "Comentário",
  whatsapp: "WhatsApp",
  email: "Email",
  lp: "Landing Page",
  indicacao: "Indicação",
  manual: "Manual",
  portal: "Portal",
};

const ORIGIN_COLORS: Record<string, string> = {
  meta_leadgen: "bg-blue-500/10 text-blue-700 border-blue-200",
  meta_ads: "bg-blue-500/10 text-blue-700 border-blue-200",
  meta_dm_instagram: "bg-pink-500/10 text-pink-700 border-pink-200",
  meta_dm_facebook: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  meta_comment: "bg-purple-500/10 text-purple-700 border-purple-200",
  whatsapp: "bg-green-500/10 text-green-700 border-green-200",
  email: "bg-orange-500/10 text-orange-700 border-orange-200",
  lp: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  indicacao: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  manual: "bg-gray-500/10 text-gray-700 border-gray-200",
  portal: "bg-teal-500/10 text-teal-700 border-teal-200",
};

const STATUS_COLUMNS = [
  { id: "novo", label: "Novos", color: "text-blue-600", dot: "bg-blue-500" },
  { id: "em_contato", label: "Em contato", color: "text-yellow-600", dot: "bg-yellow-500" },
  { id: "aguardando", label: "Aguardando", color: "text-orange-500", dot: "bg-orange-400" },
  { id: "qualificado", label: "Qualificados", color: "text-green-600", dot: "bg-green-500" },
  { id: "invalido", label: "Inválidos", color: "text-red-500", dot: "bg-red-400" },
];

export default async function SDRQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; origin?: string; tenant?: string; sdr?: string; tag?: string }>;
}) {
  const user = await requireRole(["sdr", "admin_placego"]);
  const { status, origin, tenant: tenantFilter, sdr: sdrFilter, tag: tagFilter } = await searchParams;

  const isAdmin = user.role === "admin_placego";
  const activeStatus = status ?? "novo";

  // SDR vê apenas seus assignments; admin pode ver todos ou filtrar por SDR
  const targetSdrId = isAdmin ? (sdrFilter ?? null) : user.id;

  // Buscar assignments com dados do contato
  const rows = await db
    .select({
      assignment: sdrAssignments,
      contact: leads,
      propertyAddress: properties.address,
      propertyNeighborhood: properties.neighborhood,
      tenantName: tenants.name,
      sdrName: users.name,
    })
    .from(sdrAssignments)
    .innerJoin(leads, eq(sdrAssignments.contactId, leads.id))
    .leftJoin(properties, eq(leads.sourcePropertyId, properties.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .leftJoin(users, eq(sdrAssignments.sdrId, users.id))
    .where(
      targetSdrId
        ? eq(sdrAssignments.sdrId, targetSdrId)
        : undefined
    )
    .orderBy(desc(leads.createdAt));

  // Contadores por status
  const counts: Record<string, number> = {};
  for (const col of STATUS_COLUMNS) {
    counts[col.id] = rows.filter((r) => r.assignment.status === col.id).length;
  }

  // Buscar tags de todos os contatos visíveis
  const contactIds = rows.map((r) => r.contact.id);
  const tagRows = contactIds.length > 0
    ? await db
        .select({ contactId: contactTags.contactId, tag: tags })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(inArray(contactTags.contactId, contactIds))
    : [];

  const tagsByContact = new Map<string, typeof tagRows[number]["tag"][]>();
  for (const row of tagRows) {
    const list = tagsByContact.get(row.contactId) ?? [];
    list.push(row.tag);
    tagsByContact.set(row.contactId, list);
  }

  // Filtrar para exibição
  const filtered = rows.filter((r) => {
    if (r.assignment.status !== activeStatus) return false;
    if (origin && r.contact.origin !== origin) return false;
    if (tenantFilter && r.contact.tenantId !== tenantFilter) return false;
    if (tagFilter && !(tagsByContact.get(r.contact.id) ?? []).some((t) => t.id === tagFilter)) return false;
    return true;
  });

  // Lista de empresas, SDRs e tags para filtros
  const [tenantList, sdrList, tagList] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
    isAdmin
      ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "sdr"))
      : Promise.resolve([]),
    db.select().from(tags).orderBy(tags.name),
  ]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? "Fila SDR — Visão geral" : "Minha fila"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin
              ? "Todos os contatos de todos os SDRs"
              : `${counts[activeStatus] ?? 0} contatos em "${STATUS_COLUMNS.find((c) => c.id === activeStatus)?.label}"`}
          </p>
        </div>
        {isAdmin && <AddContactButton tenants={tenantList} />}
      </div>

      {/* Kanban de status — contadores clicáveis */}
      <div className="grid grid-cols-5 gap-2">
        {STATUS_COLUMNS.map((col) => (
          <a
            key={col.id}
            href={`/sdr/queue?status=${col.id}${origin ? `&origin=${origin}` : ""}${tenantFilter ? `&tenant=${tenantFilter}` : ""}${sdrFilter ? `&sdr=${sdrFilter}` : ""}`}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-sm ${
              activeStatus === col.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-background hover:bg-muted/40"
            }`}
          >
            <span className={`text-2xl font-bold ${activeStatus === col.id ? "text-primary" : col.color}`}>
              {counts[col.id] ?? 0}
            </span>
            <div className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
              <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                {col.label}
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* Filtros */}
      <QueueFilters
        currentStatus={activeStatus}
        currentOrigin={origin}
        currentTenant={tenantFilter}
        currentSdr={sdrFilter}
        currentTag={tagFilter}
        tenants={tenantList}
        sdrs={sdrList}
        tagsList={tagList}
        isAdmin={isAdmin}
      />

      {/* Lista de contatos */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border rounded-lg bg-muted/20">
            <p className="font-medium">
              Nenhum contato em "{STATUS_COLUMNS.find((c) => c.id === activeStatus)?.label}"
            </p>
            <p className="text-sm mt-1">Tente outro filtro ou aguarde novos contatos.</p>
          </div>
        )}

        {filtered.map(({ assignment, contact, propertyAddress, propertyNeighborhood, tenantName, sdrName }) => {
          const source = propertyAddress
            ? `${propertyAddress}${propertyNeighborhood ? ` — ${propertyNeighborhood}` : ""}`
            : null;

          const age = Math.floor((Date.now() - new Date(contact.createdAt).getTime()) / 60000);
          const ageLabel =
            age < 60 ? `${age}min` : age < 1440 ? `${Math.floor(age / 60)}h` : `${Math.floor(age / 1440)}d`;

          return (
            <div
              key={assignment.id}
              className="flex items-start gap-3 p-4 bg-background border rounded-xl hover:shadow-sm transition-all group"
            >
              {/* Score */}
              <ScoreBadge score={contact.qualityScore ?? 0} />

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`/sdr/contacts/${contact.id}`} className="font-semibold hover:underline hover:text-primary">
                    {contact.name}
                  </a>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORIGIN_COLORS[contact.origin] ?? ORIGIN_COLORS.manual}`}>
                    {ORIGIN_LABELS[contact.origin] ?? contact.origin}
                  </span>
                  {isAdmin && sdrName && (
                    <Badge variant="outline" className="text-xs">SDR: {sdrName}</Badge>
                  )}
                </div>

                <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="font-mono">{contact.phone}</span>
                  {contact.email && <span>{contact.email}</span>}
                </div>

                <div className="flex gap-2 flex-wrap items-center">
                  {tenantName && (
                    <Badge variant="secondary" className="text-xs">🏢 {tenantName}</Badge>
                  )}
                  {(contact.adName ?? contact.utmCampaign ?? contact.campaignId) && (
                    <Badge variant="outline" className="text-xs">
                      📣 {contact.adName ?? contact.utmCampaign ?? `ID: ${contact.campaignId}`}
                    </Badge>
                  )}
                  {source && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      📍 {source}
                    </span>
                  )}
                  {contact.notes && (
                    <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                      💬 {contact.notes}
                    </span>
                  )}
                </div>

                <TagPicker contactId={contact.id} initialTags={tagsByContact.get(contact.id) ?? []} />
              </div>

              {/* Tempo */}
              <span className="text-xs text-muted-foreground whitespace-nowrap pt-1 shrink-0">
                {ageLabel} atrás
              </span>

              {/* Ações */}
              <SdrQueueActions
                assignmentId={assignment.id}
                contactId={contact.id}
                currentStatus={assignment.status}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
