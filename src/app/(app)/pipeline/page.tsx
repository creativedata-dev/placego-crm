import { db } from "@/db";
import { leadAssignments, leads, users, tags, contactTags, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, inArray, and } from "drizzle-orm";
import { KanbanBoard } from "./kanban-board";
import { PipelineBrokerFilter } from "./pipeline-broker-filter";

export const COLUMNS = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "contacted", label: "Contatado", color: "bg-yellow-500" },
  { id: "visiting", label: "Visita Agendada", color: "bg-purple-500" },
  { id: "proposal", label: "Proposta", color: "bg-orange-500" },
  { id: "won", label: "Ganho", color: "bg-green-500" },
  { id: "lost", label: "Perdido", color: "bg-red-400" },
] as const;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ broker?: string }>;
}) {
  const user = await requireRole(["corretor", "corretor_tenant", "admin_placego", "sdr"]);
  const { broker: brokerFilter } = await searchParams;

  const isAdmin = user.role === "admin_placego" || user.role === "sdr";

  // Filtro por corretor (só admin/SDR podem filtrar)
  const whereClause = isAdmin
    ? brokerFilter
      ? eq(leadAssignments.brokerId, brokerFilter)
      : undefined
    : eq(leadAssignments.brokerId, user.id);

  const rows = await db
    .select({
      assignment: leadAssignments,
      lead: leads,
      brokerName: users.name,
      tenantName: tenants.name,
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .innerJoin(users, eq(leadAssignments.brokerId, users.id))
    .leftJoin(tenants, eq(leads.tenantId, tenants.id))
    .where(whereClause)
    .orderBy(leadAssignments.assignedAt);

  // Buscar tags dos leads (herdadas do contato original)
  const leadIds = rows.map((r) => r.lead.id);
  const tagRows = leadIds.length > 0
    ? await db
        .select({ contactId: contactTags.contactId, tag: tags })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(inArray(contactTags.contactId, leadIds))
    : [];

  const tagsByLead = new Map<string, typeof tagRows[number]["tag"][]>();
  for (const row of tagRows) {
    const list = tagsByLead.get(row.contactId) ?? [];
    list.push(row.tag);
    tagsByLead.set(row.contactId, list);
  }

  // Agrupar por coluna
  const columns = COLUMNS.map((col) => ({
    ...col,
    cards: rows
      .filter((r) => r.assignment.status === col.id)
      .map((r) => ({ ...r, tags: tagsByLead.get(r.lead.id) ?? [], tenantName: r.tenantName })),
  }));

  // Lista de corretores para o filtro (admin/SDR only)
  const brokerList = isAdmin
    ? await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.role, ["corretor", "corretor_tenant"]))
        .orderBy(users.name)
    : [];

  return (
    <div className="space-y-4 h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground text-sm">
            {isAdmin ? "Visão global de todos os corretores" : "Seus leads em atendimento"}
          </p>
        </div>
        {isAdmin && <PipelineBrokerFilter brokers={brokerList} selected={brokerFilter ?? ""} />}
      </div>
      <KanbanBoard columns={columns} isAdmin={isAdmin} />
    </div>
  );
}
