import { requireRole } from "@/lib/auth";
import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

export default async function SDRDashboardPage() {
  const user = await requireRole(["sdr", "admin_placego"]);

  const isMySelf = user.role === "sdr";
  const sdrFilter = isMySelf ? eq(leads.sdrId, user.id) : undefined;

  const [[{ totalHandled }], avgQualResult] = await Promise.all([
    db.select({ totalHandled: count() })
      .from(leads)
      .where(and(sdrFilter, gte(leads.createdAt, thirtyDaysAgo))),
    db.execute(sql`
      SELECT ROUND(AVG(
        EXTRACT(EPOCH FROM (qualified_at - created_at)) / 60
      ))::int AS avg_qual_time
      FROM leads
      WHERE qualified_at IS NOT NULL
        AND created_at >= ${thirtyDaysAgoISO}
        ${isMySelf ? sql`AND sdr_id = ${user.id}` : sql``}
    `),
  ]);

  const avgMinutes = ((avgQualResult as any[])[0] as any)?.avg_qual_time ?? null;

  const slaBreakdown = await db.execute(sql`
    SELECT
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (qualified_at - created_at)) / 60 <= 5 THEN 1 END) AS ate5min,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (qualified_at - created_at)) / 60 BETWEEN 5 AND 30 THEN 1 END) AS de5a30min,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (qualified_at - created_at)) / 60 BETWEEN 30 AND 60 THEN 1 END) AS de30a60min,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (qualified_at - created_at)) / 60 > 60 THEN 1 END) AS acima60min
    FROM leads
    WHERE qualified_at IS NOT NULL
      AND created_at >= ${thirtyDaysAgoISO}
      ${isMySelf ? sql`AND sdr_id = ${user.id}` : sql``}
  `);

  const slaRow = (slaBreakdown as any[])[0] as Record<string, number>;

  const rejectionStats = await db.execute(sql`
    SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN status = 'invalid' THEN 1 END) AS invalid,
      COUNT(CASE WHEN status = 'duplicate' THEN 1 END) AS duplicate,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) AS qualified
    FROM leads
    WHERE created_at >= ${thirtyDaysAgoISO}
    ${isMySelf ? sql`AND sdr_id = ${user.id}` : sql``}
  `);

  const rej = (rejectionStats as any[])[0] as any;
  const rejectionRate = rej?.total > 0
    ? Math.round(((Number(rej.invalid) + Number(rej.duplicate)) / Number(rej.total)) * 100)
    : 0;

  const [{ inQueue }] = await db
    .select({ inQueue: count() })
    .from(leads)
    .where(eq(leads.status, "new"));

  const recentQualified = await db
    .select({ lead: leads, sdrName: users.name })
    .from(leads)
    .leftJoin(users, eq(leads.sdrId, users.id))
    .where(and(eq(leads.status, "qualified"), gte(leads.createdAt, thirtyDaysAgo)))
    .orderBy(sql`leads.qualified_at DESC`)
    .limit(10);

  function formatMinutes(min: number | null) {
    if (min === null) return "—";
    if (min < 60) return `${min}min`;
    return `${Math.floor(min / 60)}h ${min % 60}min`;
  }

  const slaItems = [
    { label: "Até 5 min", value: Number(slaRow?.ate5min ?? 0), color: "text-green-600", bg: "#22c55e" },
    { label: "5 – 30 min", value: Number(slaRow?.de5a30min ?? 0), color: "text-yellow-600", bg: "#eab308" },
    { label: "30 – 60 min", value: Number(slaRow?.de30a60min ?? 0), color: "text-orange-500", bg: "#f97316" },
    { label: "Acima de 60 min", value: Number(slaRow?.acima60min ?? 0), color: "text-red-500", bg: "#ef4444" },
  ];

  const slaTotal = slaItems.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard SDR</h1>
        <p className="text-muted-foreground text-sm">
          {isMySelf ? "Seu desempenho — " : "Visão global — "}últimos 30 dias
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Leads tratados", value: totalHandled, color: "" },
          { label: "Tempo médio de qualif.", value: formatMinutes(avgMinutes), color: "" },
          { label: "Taxa de rejeição", value: `${rejectionRate}%`, color: rejectionRate > 30 ? "text-red-500" : "" },
          { label: "Na fila agora", value: inQueue, color: inQueue > 10 ? "text-red-500" : "" },
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
            <CardTitle className="text-base">SLA de qualificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {slaItems.map((s) => {
              const pct = slaTotal > 0 ? Math.round((s.value / slaTotal) * 100) : 0;
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{s.label}</span>
                    <span className={`font-semibold ${s.color}`}>
                      {s.value} <span className="text-muted-foreground font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: s.bg }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown de leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "Qualificados", value: Number(rej?.qualified ?? 0), color: "bg-green-500" },
                { label: "Inválidos", value: Number(rej?.invalid ?? 0), color: "bg-red-400" },
                { label: "Duplicados", value: Number(rej?.duplicate ?? 0), color: "bg-gray-400" },
              ].map((item) => {
                const total = Number(rej?.total ?? 1);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.color}`} />
                    <span className="text-sm flex-1">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                    <span className="text-sm font-semibold w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas qualificações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>SDR</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Qualificado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentQualified.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                    Nenhum lead qualificado ainda.
                  </TableCell>
                </TableRow>
              )}
              {recentQualified.map(({ lead, sdrName }) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">{lead.phone}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {lead.origin.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sdrName ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-semibold ${(lead.qualityScore ?? 0) >= 70 ? "text-green-600" : (lead.qualityScore ?? 0) >= 40 ? "text-yellow-600" : "text-red-500"}`}>
                      {lead.qualityScore ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.qualifiedAt
                      ? new Date(lead.qualifiedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
