import { db } from "@/db";
import { leads, sdrAssignments, properties, tenants, users, tags, contactTags, leadAssignments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, desc, inArray } from "drizzle-orm";
import { QueueFilters } from "./queue-filters";
import { AddContactButton } from "./add-contact-button";
import { SdrKanbanBoard } from "./sdr-kanban-board";

export const STATUS_COLUMNS = [
  { id: "novo", label: "Novos", color: "bg-blue-500" },
  { id: "em_contato", label: "Em contato", color: "bg-yellow-500" },
  { id: "aguardando", label: "Aguardando", color: "bg-orange-400" },
  { id: "qualificado", label: "Qualificado", color: "bg-green-500" },
  { id: "distribuido", label: "Distribuído", color: "bg-purple-500" },
  { id: "invalido", label: "Inválido", color: "bg-red-400" },
] as const;

export default async function SDRQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; tenant?: string; sdr?: string; tag?: string; broker?: string }>;
}) {
  const user = await requireRole(["sdr", "admin_placego"]);
  const { origin, tenant: tenantFilter, sdr: sdrFilter, tag: tagFilter, broker: brokerFilter } = await searchParams;

  const isAdmin = user.role === "admin_placego";
  const targetSdrId = isAdmin ? (sdrFilter ?? null) : user.id;

  // Buscar todos os assignments (todas as colunas)
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
    .where(targetSdrId ? eq(sdrAssignments.sdrId, targetSdrId) : undefined)
    .orderBy(desc(leads.createdAt));

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

  // Buscar corretores atribuídos (para contatos já distribuídos)
  const distributedIds = rows
    .filter((r) => r.assignment.status === "distribuido")
    .map((r) => r.contact.id);

  const brokerRows = distributedIds.length > 0
    ? await db
        .select({ leadId: leadAssignments.leadId, brokerId: users.id, brokerName: users.name })
        .from(leadAssignments)
        .innerJoin(users, eq(leadAssignments.brokerId, users.id))
        .where(inArray(leadAssignments.leadId, distributedIds))
    : [];

  const brokersByContact = new Map<string, { id: string; name: string }[]>();
  for (const row of brokerRows) {
    const list = brokersByContact.get(row.leadId) ?? [];
    list.push({ id: row.brokerId, name: row.brokerName });
    brokersByContact.set(row.leadId, list);
  }

  // Filtrar (sem filtrar por status — isso é feito nas colunas)
  const filtered = rows.filter((r) => {
    if (origin && r.contact.origin !== origin) return false;
    if (tenantFilter && r.contact.tenantId !== tenantFilter) return false;
    if (tagFilter && !(tagsByContact.get(r.contact.id) ?? []).some((t) => t.id === tagFilter)) return false;
    if (brokerFilter && !(brokersByContact.get(r.contact.id) ?? []).some((b) => b.id === brokerFilter)) return false;
    return true;
  });

  // Lista de empresas, SDRs, tags e corretores para filtros
  const [tenantList, sdrList, tagList, brokerList] = await Promise.all([
    db.select({ id: tenants.id, name: tenants.name }).from(tenants),
    isAdmin
      ? db.select({ id: users.id, name: users.name }).from(users).where(eq(users.role, "sdr"))
      : Promise.resolve([]),
    db.select().from(tags).orderBy(tags.name),
    db.select({ id: users.id, name: users.name }).from(users)
      .where(inArray(users.role, ["corretor", "corretor_tenant"])),
  ]);

  // Agrupar por coluna
  const columns = STATUS_COLUMNS.map((col) => ({
    ...col,
    cards: filtered
      .filter((r) => r.assignment.status === col.id)
      .map((r) => ({
        ...r,
        tags: tagsByContact.get(r.contact.id) ?? [],
        brokerNames: (brokersByContact.get(r.contact.id) ?? []).map((b) => b.name),
      })),
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isAdmin ? "Fila SDR — Visão geral" : "Minha fila"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Todos os contatos de todos os SDRs" : `${filtered.length} contatos no total`}
          </p>
        </div>
        {isAdmin && <AddContactButton tenants={tenantList} />}
      </div>

      {/* Filtros */}
      <QueueFilters
        currentOrigin={origin}
        currentTenant={tenantFilter}
        currentSdr={sdrFilter}
        currentTag={tagFilter}
        currentBroker={brokerFilter}
        tenants={tenantList}
        sdrs={sdrList}
        tagsList={tagList}
        brokers={brokerList}
        isAdmin={isAdmin}
      />

      {/* Kanban */}
      <SdrKanbanBoard columns={columns} isAdmin={isAdmin} />
    </div>
  );
}
