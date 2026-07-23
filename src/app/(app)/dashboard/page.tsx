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
import { ContactsChart } from "./contacts-chart";
import { redirect } from "next/navigation";
import { Users, Star, Trophy, TrendingUp, XCircle } from "lucide-react";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireAuth();

  if (user.role === "sdr") redirect("/sdr/dashboard");
  if (user.role === "corretor" || user.role === "corretor_tenant") redirect("/pipeline");
  if (user.role === "admin_tenant") redirect("/tenant/dashboard");

  const params = await searchParams;
  const today = toISODate(new Date());
  const defaultFrom = toISODate(new Date(Date.now() - 30 * 86400000));
  const fromDate = params.from ?? defaultFrom;
  const toDate = params.to ?? today;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

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
      COUNT(DISTINCT CASE WHEN sa.status = 'qualificado' THEN l.id END) AS qualified_leads,
      COUNT(DISTINCT CASE WHEN la.status = 'won' THEN la.id END) AS won_leads
    FROM tenants t
    LEFT JOIN leads l ON l.tenant_id = t.id
      AND l.created_at >= ${thirtyDaysAgoISO}
    LEFT JOIN sdr_assignments sa ON sa.contact_id = l.id
    LEFT JOIN lead_assignments la ON la.lead_id = l.id AND la.status = 'won'
    GROUP BY t.id, t.name, t.type
    ORDER BY total_leads DESC
    LIMIT 10
  `);

  // Série temporal: contatos por dia no range selecionado
  // Converter para ISO timestamp para evitar bug do postgres.js com ::date na Vercel
  const fromISO = fromDate + "T00:00:00.000Z";
  const toISO = toDate + "T23:59:59.999Z";

  const contactsPerDay = await db.execute(sql`
    SELECT
      TO_CHAR(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS day,
      COUNT(*) AS total
    FROM leads
    WHERE created_at >= ${fromISO}
      AND created_at <= ${toISO}
    GROUP BY day
    ORDER BY day ASC
  `);

  // Preencher dias sem dados com zero (row.day é string "YYYY-MM-DD" via TO_CHAR)
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
        <p className="text-muted-foreground text-sm">Últimos 30 dias · KPIs fixos</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {/* Capturados */}
        <Card className="border-0 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-indigo-100">Capturados</CardTitle>
              <Users className="h-4 w-4 text-indigo-200" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{total}</p>
            <p className="text-xs text-indigo-200 mt-1">últimos 30 dias</p>
          </CardContent>
        </Card>

        {/* Na fila */}
        <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-blue-100">Na fila</CardTitle>
              <Star className="h-4 w-4 text-blue-200" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{newLeads}</p>
            <p className="text-xs text-blue-200 mt-1">aguardando SDR</p>
          </CardContent>
        </Card>

        {/* Qualificados */}
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
              <div
                className="h-full bg-white/70 rounded-full"
                style={{ width: total > 0 ? `${Math.min(100, Math.round((qualified / total) * 100))}%` : "0%" }}
              />
            </div>
            <p className="text-xs text-amber-200 mt-1">
              {total > 0 ? `${Math.round((qualified / total) * 100)}%` : "0%"} do total
            </p>
          </CardContent>
        </Card>

        {/* Ganhos */}
        <Card className="border-0 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-emerald-100">Ganhos</CardTitle>
              <Trophy className="h-4 w-4 text-emerald-200" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{won}</p>
            <p className="text-xs text-emerald-200 mt-1">negócios fechados</p>
          </CardContent>
        </Card>

        {/* Taxa de conversão */}
        <Card className={`border-0 shadow-md text-white ${conversionRate >= 20
          ? "bg-gradient-to-br from-teal-500 to-cyan-600"
          : conversionRate >= 10
          ? "bg-gradient-to-br from-yellow-500 to-amber-600"
          : "bg-gradient-to-br from-rose-500 to-red-600"
        }`}>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-white/80">Conversão</CardTitle>
              <XCircle className="h-4 w-4 text-white/60" />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className="text-3xl font-bold">{conversionRate}%</p>
            <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full"
                style={{ width: `${Math.min(100, conversionRate)}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-1">qualif. → ganho</p>
          </CardContent>
        </Card>
      </div>

      <ContactsChart data={chartData} from={fromDate} to={toDate} />

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
                {(brokerStats as any[]).map((b, i) => {
                  const brokerConv = b.total_assigned > 0
                    ? Math.round((Number(b.won) / Number(b.total_assigned)) * 100) : 0;
                  return (
                    <TableRow key={i} className={i === 0 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                      <TableCell className="font-medium text-sm flex items-center gap-2">
                        {i === 0 && <span className="text-amber-500">🥇</span>}
                        {i === 1 && <span className="text-slate-400">🥈</span>}
                        {i === 2 && <span className="text-amber-600">🥉</span>}
                        {b.broker_name}
                      </TableCell>
                      <TableCell className="text-center text-sm">{b.total_assigned}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          {b.in_progress}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          {b.won}
                          {brokerConv > 0 && <span className="text-emerald-500/70">· {brokerConv}%</span>}
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
                  ? Math.round((Number(t.won_leads) / Number(t.qualified_leads)) * 100)
                  : 0;
                const TYPE_COLORS: Record<string, string> = {
                  imobiliaria:  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
                  incorporadora: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
                  construtora:  "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
                  corretor:     "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300",
                };
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-sm">{t.tenant_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${TYPE_COLORS[t.tenant_type] ?? ""}`}>
                        {TYPE_LABELS[t.tenant_type] ?? t.tenant_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-sm">{t.total_leads}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        {t.qualified_leads}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {t.won_leads}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={`inline-flex items-center gap-1 font-semibold ${
                        conv >= 20 ? "text-emerald-600" : conv >= 10 ? "text-amber-600" : "text-muted-foreground"
                      }`}>
                        {conv >= 20 ? "🟢" : conv >= 10 ? "🟡" : "🔴"} {conv}%
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
