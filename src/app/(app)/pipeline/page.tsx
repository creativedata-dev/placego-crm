import { db } from "@/db";
import { leadAssignments, leads, users, tags, contactTags, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import { KanbanBoard } from "./kanban-board";

export const COLUMNS = [
  { id: "new", label: "Novo", color: "bg-blue-500" },
  { id: "contacted", label: "Contatado", color: "bg-yellow-500" },
  { id: "visiting", label: "Visita Agendada", color: "bg-purple-500" },
  { id: "proposal", label: "Proposta", color: "bg-orange-500" },
  { id: "won", label: "Ganho", color: "bg-green-500" },
  { id: "lost", label: "Perdido", color: "bg-red-400" },
] as const;

export default async function PipelinePage() {
  const user = await requireRole(["corretor", "corretor_tenant", "admin_placego", "sdr"]);

  const isAdmin = user.role === "admin_placego" || user.role === "sdr";

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
    .where(isAdmin ? undefined : eq(leadAssignments.brokerId, user.id))
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

  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground text-sm">
          {isAdmin ? "Visão global de todos os corretores" : "Seus leads em atendimento"}
        </p>
      </div>
      <KanbanBoard columns={columns} isAdmin={isAdmin} />
    </div>
  );
}
