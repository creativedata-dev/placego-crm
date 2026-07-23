import { db } from "@/db";
import { leads, leadAssignments, users, tenants, sdrAssignments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Handshake, Trophy } from "lucide-react";
import { FunnelChart } from "../../dashboard/funnel-chart";
import { ContactsChart } from "../../dashboard/contacts-chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function TenantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireRole(["admin_tenant", "admin_placego"]);

  const tenantId = user.tenantId;
  if (!tenantId) return <p className="text-muted-foreground">Tenant não configurado.</p>;

  const params = await searchParams;
  const today = toISODate(new Date());
  const defaultFrom = toISODate(new Date(Date.now() - 30 * 86400000));
  const fromDate = params.from ?? defaultFrom;
  const toDate = params.to ?? today;

  const [tenantData] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const tenantName = tenantData?.name ?? "Empresa";

  // Todos os leads do tenant
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
  const lost = tenantLeads.filter((r) => r.assignment?.status === "lost").length;
  const convRate = qualified > 0 ? Math.round((won / qualified) * 100) : 0;

  // Série temporal filtrada pelo range
  const fromISO = fromDate + "T00:00:00.000Z";
  const toISO = toDate + "T23:59:59.999Z";

  const contactsPerDay = await db.execute(sql`
    SELECT
      TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
      COUNT(*) AS total
    FROM leads
    WHERE tenant_id = ${tenantId}
      AND created_at >= ${fromISO}
      AND created_at <= ${toISO}
    GROUP BY day
    ORDER BY day ASC
  `);

  const dayMap = new Map<string, number>();
  for (const row of contactsPerDay as any[]) {
    dayMap.set(String(row.day), Number(row.total));
  }
  const chartData: { date: string; total: number }[] = [];
  const cursor = new Date(fromDate + "T00:00:00");
  const end = new Date(toDate + "T00:00:00");
  while (cursor <= end) {
    const key = toISODate(cursor);
    const label = cursor.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    chartData.push({ date: label, total: dayMap.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // Funil
  const funnelData = [
    { label: "Capturados", value: total, color: "#6366f1" },
    { label: "Qualificados", value: qualified, color: "#22c55e" },
    { label: "Em atendimento", value: Math.max(0, qualified - won - lost), color: "#f59e0b" },
    { label: "Ganhos", value: won, color: "#10b981" },
  ];

  // Leads recentes (20 mais recentes)
  const recentLeads = uniqueLeads.slice(-20).reverse();

  const fmtDateTime = (d: Date) =>
    new Date(d).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tenantName}</h1>
        <p className="text-muted-foreground text-sm">Painel do Administrador</p>
      </div>

      {/* KPI cards */}
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

      {/* Gráfico de linha — contatos por dia */}
      <ContactsChart data={chartData} from={fromDate} to={toDate} />

      {/* Funil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funil de leads</CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelChart data={funnelData} />
        </CardContent>
      </Card>

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
                  <span className="text-xs text-muted-foreground shrink-0 text-right">
                    {fmtDateTime(lead.createdAt)}
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
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {fmtDateTime(lead.createdAt)}
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
