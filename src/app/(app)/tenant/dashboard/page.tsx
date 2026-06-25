import { db } from "@/db";
import { leads, leadAssignments, properties, users } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, and, count, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  waiting: "Aguardando",
  qualified: "Qualificado",
  invalid: "Inválido",
  duplicate: "Duplicado",
};

const ASSIGNMENT_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  visiting: "Visita",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

const ASSIGNMENT_COLORS: Record<string, string> = {
  new: "secondary",
  contacted: "secondary",
  visiting: "secondary",
  proposal: "secondary",
  won: "default",
  lost: "destructive",
};

export default async function TenantDashboardPage() {
  const user = await requireRole(["admin_tenant", "admin_placego"]);

  const tenantId = user.tenantId;
  if (!tenantId) return <p className="text-muted-foreground">Tenant não configurado.</p>;

  // Imóveis do tenant
  const tenantProperties = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.tenantId, tenantId));

  const propertyIds = tenantProperties.map((p) => p.id);

  // Leads vinculados aos imóveis do tenant
  const tenantLeads = propertyIds.length > 0
    ? await db
        .select({
          lead: leads,
          assignments: leadAssignments,
          brokerName: users.name,
        })
        .from(leads)
        .leftJoin(leadAssignments, eq(leads.id, leadAssignments.leadId))
        .leftJoin(users, eq(leadAssignments.brokerId, users.id))
        .where(inArray(leads.sourcePropertyId, propertyIds))
        .orderBy(leads.createdAt)
    : [];

  // Métricas
  const uniqueLeads = [...new Map(tenantLeads.map((r) => [r.lead.id, r.lead])).values()];
  const total = uniqueLeads.length;
  const qualified = uniqueLeads.filter((l) => l.status === "qualified").length;
  const inProgress = tenantLeads.filter((r) => r.assignments && !["won", "lost"].includes(r.assignments.status)).length;
  const won = tenantLeads.filter((r) => r.assignments?.status === "won").length;

  // Últimos 20 leads
  const recentLeads = uniqueLeads.slice(-20).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel do Tenant</h1>
        <p className="text-muted-foreground text-sm">Visão dos seus leads e corretores</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total de leads</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Qualificados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{qualified}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Em atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Convertidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{won}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de leads */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Leads recentes</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Recebido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    Nenhum lead recebido ainda.
                  </TableCell>
                </TableRow>
              )}
              {recentLeads.map((lead) => {
                const assignment = tenantLeads.find(
                  (r) => r.lead.id === lead.id && r.assignments
                );
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                      {lead.origin.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {assignment?.brokerName ?? "—"}
                    </TableCell>
                    <TableCell>
                      {assignment?.assignments ? (
                        <Badge
                          variant={ASSIGNMENT_COLORS[assignment.assignments.status] as any}
                          className="text-xs"
                        >
                          {ASSIGNMENT_LABELS[assignment.assignments.status]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não distribuído</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
