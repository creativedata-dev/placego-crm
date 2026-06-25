import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { leads, leadAssignments } from "@/db/schema";
import { eq, count, and, gte, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FunnelChart } from "./funnel-chart";
import { redirect } from "next/navigation";

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

export default async function DashboardPage() {
  const user = await requireAuth();

  if (user.role === "sdr") redirect("/sdr/dashboard");
  if (user.role === "corretor" || user.role === "corretor_tenant") redirect("/pipeline");
  if (user.role === "admin_tenant") redirect("/tenant/dashboard");

  const [
    [{ total }],
    [{ newLeads }],
    [{ qualified }],
    [{ won }],
    [{ lost }],
  ] = await Promise.all([
    db.select({ total: count() }).from(leads).where(gte(leads.createdAt, thirtyDaysAgo)),
    db.select({ newLeads: count() }).from(leads).where(and(eq(leads.status, "new"), gte(leads.createdAt, thirtyDaysAgo))),
    db.select({ qualified: count() }).from(leads).where(and(eq(leads.status, "qualified"), gte(leads.createdAt, thirtyDaysAgo))),
    db.select({ won: count() }).from(leadAssignments).where(and(eq(leadAssignments.status, "won"), gte(leadAssignments.assignedAt, thirtyDaysAgo))),
    db.select({ lost: count() }).from(leadAssignments).where(and(eq(leadAssignments.status, "lost"), gte(leadAssignments.assignedAt, thirtyDaysAgo))),
  ]);

  const conversionRate = qualified > 0 ? Math.round((won / qualified) * 100) : 0;

  const funnelData = [
    { label: "Capturados", value: total, color: "#6366f1" },
    { label: "Qualificados", value: qualified, color: "#22c55e" },
    { label: "Em atendimento", value: Math.max(0, qualified - won - lost), color: "#f59e0b" },
    { label: "Ganhos", value: won, color: "#10b981" },
  ];

  const tenantStats = await db.execute(sql`
    SELECT
      t.name AS tenant_name,
      t.type AS tenant_type,
      COUNT(DISTINCT l.id) AS total_leads,
      COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) AS qualified_leads,
      COUNT(DISTINCT CASE WHEN la.status = 'won' THEN la.id END) AS won_leads
    FROM tenants t
    LEFT JOIN properties p ON p.tenant_id = t.id
    LEFT JOIN leads l ON l.source_property_id = p.id
      AND l.created_at >= ${thirtyDaysAgoISO}
    LEFT JOIN lead_assignments la ON la.lead_id = l.id AND la.status = 'won'
    GROUP BY t.id, t.name, t.type
    ORDER BY total_leads DESC
    LIMIT 10
  `);

  const brokerStats = await db.execute(sql`
    SELECT
      u.name AS broker_name,
      COUNT(la.id) AS total_assigned,
      COUNT(CASE WHEN la.status = 'won' THEN 1 END) AS won,
      COUNT(CASE WHEN la.status IN ('contacted','visiting','proposal') THEN 1 END) AS in_progress
    FROM users u
    JOIN lead_assignments la ON la.broker_id = u.id
      AND la.assigned_at >= ${thirtyDaysAgoISO}
    WHERE u.role IN ('corretor', 'corretor_tenant')
    GROUP BY u.id, u.name
    ORDER BY won DESC, total_assigned DESC
    LIMIT 8
  `);

  const TYPE_LABELS: Record<string, string> = {
    imobiliaria: "Imobiliária",
    incorporadora: "Incorporadora",
    construtora: "Construtora",
    corretor: "Corretor",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Últimos 30 dias</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: "Leads capturados", value: total, color: "" },
          { label: "Na fila (novos)", value: newLeads, color: "text-blue-600" },
          { label: "Qualificados", value: qualified, color: "text-green-600" },
          { label: "Ganhos", value: won, color: "text-emerald-600" },
          { label: "Taxa de conversão", value: `${conversionRate}%`, color: conversionRate >= 20 ? "text-green-600" : "text-yellow-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de leads</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnelData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top corretores</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Corretor</TableHead>
                  <TableHead className="text-center">Recebidos</TableHead>
                  <TableHead className="text-center">Andamento</TableHead>
                  <TableHead className="text-center">Ganhos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(brokerStats as any[]).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                      Nenhum dado ainda.
                    </TableCell>
                  </TableRow>
                )}
                {(brokerStats as any[]).map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{b.broker_name}</TableCell>
                    <TableCell className="text-center text-sm">{b.total_assigned}</TableCell>
                    <TableCell className="text-center text-sm text-blue-600">{b.in_progress}</TableCell>
                    <TableCell className="text-center text-sm text-emerald-600 font-semibold">{b.won}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume por empresa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Leads</TableHead>
                <TableHead className="text-center">Qualificados</TableHead>
                <TableHead className="text-center">Ganhos</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(tenantStats as any[]).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">
                    Nenhum tenant com leads ainda.
                  </TableCell>
                </TableRow>
              )}
              {(tenantStats as any[]).map((t, i) => {
                const conv = t.qualified_leads > 0
                  ? Math.round((t.won_leads / t.qualified_leads) * 100)
                  : 0;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{t.tenant_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[t.tenant_type] ?? t.tenant_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{t.total_leads}</TableCell>
                    <TableCell className="text-center text-sm text-green-600">{t.qualified_leads}</TableCell>
                    <TableCell className="text-center text-sm text-emerald-600 font-semibold">{t.won_leads}</TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={conv >= 20 ? "text-green-600 font-semibold" : "text-muted-foreground"}>
                        {conv}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
