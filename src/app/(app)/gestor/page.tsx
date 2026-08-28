import { db } from "@/db";
import { leadAssignments, leads, users, tenants, contactMessages } from "@/db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { GestorKanban } from "./gestor-kanban";

export const GESTOR_COLUMNS = [
  { id: "new",       label: "Recebidos",     color: "bg-blue-900" },
  { id: "contacted", label: "Distribuídos",  color: "bg-yellow-500" },
  { id: "visiting",  label: "Em visita",     color: "bg-purple-600" },
  { id: "proposal",  label: "Em negociação", color: "bg-orange-500" },
  { id: "won",       label: "Vendido",       color: "bg-green-600" },
  { id: "lost",      label: "Perdido",       color: "bg-red-600" },
] as const;

export default async function GestorPage() {
  const user = await requireRole(["gestor_imobiliaria", "admin_placego"]);

  // Busca corretores do mesmo tenant do gestor
  const [gestorUser] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  const tenantId = gestorUser?.tenantId;

  // Leads atribuídos diretamente ao gestor (vindos do SDR)
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
    .where(
      and(
        eq(leadAssignments.brokerId, user.id),
        ne(leadAssignments.archived, true),
      )
    )
    .orderBy(desc(leadAssignments.assignedAt));

  // Corretores ativos do tenant do gestor para o seletor de distribuição
  const brokers = tenantId
    ? await db
        .select({ id: users.id, name: users.name, phone: users.phone })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            eq(users.isActive, true),
          )
        )
        .orderBy(users.name)
    : [];

  const columns = GESTOR_COLUMNS.map((col) => ({
    ...col,
    cards: rows
      .filter((r) => r.assignment.status === col.id)
      .map((r) => ({
        assignment: r.assignment,
        lead: r.lead,
        brokerName: r.brokerName,
        tenantName: r.tenantName ?? null,
        tags: [],
      })),
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Painel da Imobiliária</h1>
        <p className="text-sm text-muted-foreground">Leads recebidos do SDR — distribua para seus corretores</p>
      </div>
      <GestorKanban columns={columns} brokers={brokers} />
    </div>
  );
}
