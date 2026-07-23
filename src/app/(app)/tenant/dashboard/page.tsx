import { db } from "@/db";
import { leads, leadAssignments, properties, users, tenants } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, TrendingUp, Handshake, Trophy } from "lucide-react";

const ASSIGNMENT_LABELS: Record<string, string> = {
  new: "Novo", contacted: "Contatado", visiting: "Visita",
  proposal: "Proposta", won: "Ganho", lost: "Perdido",
};

const ASSIGNMENT_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700", contacted: "bg-yellow-100 text-yellow-700",
  visiting: "bg-purple-100 text-purple-700", proposal: "bg-orange-100 text-orange-700",
  won: "bg-emerald-100 text-emerald-700", lost: "bg-red-100 text-red-700",
};

const ORIGIN_LABELS: Record<string, string> = {
  meta_leadgen: "Meta Ads", meta_dm_instagram: "Instagram DM",
  meta_dm_facebook: "Facebook DM", whatsapp: "WhatsApp",
  email: "Email", lp: "Landing Page", manual: "Manual",
  indicacao: "Indicação", portal: "Portal",
};

export default async function TenantDashboardPage() {
  const user = await requireRole(["admin_tenant", "admin_placego"]);

  const tenantId = user.tenantId;
  if (!tenantId) return <p className="text-muted-foreground">Tenant não configurado.</p>;

  const [tenantData] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const tenantName = tenantData?.name ?? "Empresa";

  // Leads diretos pelo tenant_id (não apenas via imóvel)
  const tenantLeads = await db
    .select({
      lead: leads,
      assignment: leadAssignments,
      brokerName: users.name,
    })
    .from(leads)
    .leftJoin(leadAssignments, eq(leads.id, leadAssignments.leadId))
    .leftJoin(users, eq(leadAssignments.brokerId, users.id))
    .where(eq(leads.tenantId, tenantId))
    .orderBy(leads.createdAt);

  const uniqueLeads = [...new Map(tenantLeads.map((r) => [r.lead.id, r.lead])).values()];
  const total = uniqueLeads.length;
  const qualified = uniqueLeads.filter((l) => l.stage === "lead").length;
  const inProgress = tenantLeads.filter((r) => r.assignment && !["won", "lost"].includes(r.assignment.status)).length;
  const won = tenantLeads.filter((r) => r.assignment?.status === "won").length;
  const convRate = qualified > 0 ? Math.round((won / qualified) * 100) : 0;

  const recentLeads = uniqueLeads.slice(-20).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tenantName}</h1>
        <p className="text-muted-foreground text-sm">Painel do Administrador</p>
      </div>

      {/* KPI cards com gradientes — mesmo padrão do admin_placego */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-indigo-100">Total de leads</CardTitle>
              <Users className="h-4 w-4 text-indigo-200" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{total}</p>
            <p className="text-xs text-indigo-200 mt-1">capturados</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-amber-100">Qualificados</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-200" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{qualified}</p>
            <div className="mt-2 h-1.5 bg-amber-400/40 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 rounded-full"
                style={{ width: total > 0 ? `${Math.min(100, Math.round((qualified / total) * 100))}%` : "0%" }} />
            </div>
            <p className="text-xs text-amber-200 mt-1">
              {total > 0 ? `${Math.round((qualified / total) * 100)}%` : "0%"} do total
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-blue-100">Em atendimento</CardTitle>
              <Handshake className="h-4 w-4 text-blue-200" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{inProgress}</p>
            <p className="text-xs text-blue-200 mt-1">com corretor</p>
          </CardContent>
        </Card>

        <Card className={`border-0 shadow-md text-white ${
          convRate >= 20 ? "bg-gradient-to-br from-emerald-500 to-green-600"
          : convRate >= 10 ? "bg-gradient-to-br from-yellow-500 to-amber-600"
          : "bg-gradient-to-br from-rose-500 to-red-600"
        }`}>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-white/80">Convertidos</CardTitle>
              <Trophy className="h-4 w-4 text-white/60" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{won}</p>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white/60 rounded-full" style={{ width: `${Math.min(100, convRate)}%` }} />
            </div>
            <p className="text-xs text-white/70 mt-1">{convRate}% conv.</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads recentes */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Leads recentes</h2>

        {/* Mobile */}
        <div className="sm:hidden space-y-2">
          {recentLeads.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum lead recebido ainda.</p>
          )}
          {recentLeads.map((lead) => {
            const row = tenantLeads.find((r) => r.lead.id === lead.id && r.assignment);
            return (
              <div key={lead.id} className="border rounded-xl p-3 space-y-2 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <Badge variant="outline" className="text-xs">{ORIGIN_LABELS[lead.origin] ?? lead.origin}</Badge>
                  {row?.assignment ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ASSIGNMENT_COLORS[row.assignment.status] ?? ""}`}>
                      {ASSIGNMENT_LABELS[row.assignment.status]}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Não distribuído</span>
                  )}
                  {row?.brokerName && <span className="text-xs text-muted-foreground">👤 {row.brokerName}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Recebido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLeads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    Nenhum lead recebido ainda.
                  </TableCell>
                </TableRow>
              )}
              {recentLeads.map((lead) => {
                const row = tenantLeads.find((r) => r.lead.id === lead.id && r.assignment);
                return (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ORIGIN_LABELS[lead.origin] ?? lead.origin}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row?.brokerName ?? "—"}</TableCell>
                    <TableCell>
                      {row?.assignment ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ASSIGNMENT_COLORS[row.assignment.status] ?? ""}`}>
                          {ASSIGNMENT_LABELS[row.assignment.status]}
                        </span>
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
