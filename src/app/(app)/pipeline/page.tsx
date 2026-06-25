import { db } from "@/db";
import { leadAssignments, leads, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
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
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .innerJoin(users, eq(leadAssignments.brokerId, users.id))
    .where(
      isAdmin
        ? undefined
        : eq(leadAssignments.brokerId, user.id)
    )
    .orderBy(leadAssignments.assignedAt);

  // Agrupar por coluna
  const columns = COLUMNS.map((col) => ({
    ...col,
    cards: rows.filter((r) => r.assignment.status === col.id),
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
