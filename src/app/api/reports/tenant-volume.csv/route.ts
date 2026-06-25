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
      t.name AS tenant,
      t.type AS tipo,
      t.slug AS slug,
      COUNT(DISTINCT l.id) AS total_leads,
      COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) AS qualificados,
      COUNT(DISTINCT CASE WHEN l.status = 'invalid' THEN l.id END) AS invalidos,
      COUNT(DISTINCT CASE WHEN l.status = 'duplicate' THEN l.id END) AS duplicados,
      COUNT(DISTINCT CASE WHEN la.status = 'won' THEN la.id END) AS ganhos,
      ROUND(
        COUNT(DISTINCT CASE WHEN la.status = 'won' THEN la.id END)::numeric
        / NULLIF(COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END), 0) * 100, 1
      ) AS conversao_pct
    FROM tenants t
    LEFT JOIN properties p ON p.tenant_id = t.id
    LEFT JOIN leads l ON l.source_property_id = p.id
    LEFT JOIN lead_assignments la ON la.lead_id = l.id
    GROUP BY t.id, t.name, t.type, t.slug
    ORDER BY total_leads DESC
  `);

  const csv = toCSV(result as any[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tenant-volume-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
