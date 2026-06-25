import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireRole } from "@/lib/auth";
import { sql } from "drizzle-orm";

function toCSV(rows: Record<string, any>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = r[h] ?? "";
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(";")
    ),
  ];
  return lines.join("\n");
}

export async function GET() {
  await requireRole(["admin_placego"]);

  const result = await db.execute(sql`
    SELECT
      u.name AS sdr,
      u.email AS email,
      COUNT(l.id) AS total_leads,
      COUNT(CASE WHEN l.status = 'qualified' THEN 1 END) AS qualificados,
      COUNT(CASE WHEN l.status = 'invalid' THEN 1 END) AS invalidos,
      COUNT(CASE WHEN l.status = 'duplicate' THEN 1 END) AS duplicados,
      ROUND(
        COUNT(CASE WHEN l.status IN ('invalid','duplicate') THEN 1 END)::numeric
        / NULLIF(COUNT(l.id), 0) * 100, 1
      ) AS taxa_rejeicao_pct,
      ROUND(AVG(
        EXTRACT(EPOCH FROM (l.qualified_at - l.created_at)) / 60
      ))::int AS tempo_medio_qualif_min
    FROM users u
    JOIN leads l ON l.sdr_id = u.id
    WHERE u.role IN ('sdr', 'admin_placego')
    GROUP BY u.id, u.name, u.email
    ORDER BY qualificados DESC
  `);

  const csv = toCSV(result as any[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sdr-performance-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
