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

// GET /api/reports/tags.csv?tag=<tagId> — opcional, filtra por uma tag específica
export async function GET(request: Request) {
  await requireRole(["admin_placego", "sdr"]);

  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get("tag");

  const result = await db.execute(sql`
    SELECT
      t.name AS tag,
      l.name AS contato,
      l.phone AS telefone,
      l.email AS email,
      l.origin AS origem,
      l.stage AS estagio,
      l.status AS status,
      l.quality_score AS score,
      ten.name AS empresa,
      u_sdr.name AS sdr,
      ct.tagged_at AS marcado_em
    FROM contact_tags ct
    JOIN tags t ON t.id = ct.tag_id
    JOIN leads l ON l.id = ct.contact_id
    LEFT JOIN tenants ten ON ten.id = l.tenant_id
    LEFT JOIN users u_sdr ON u_sdr.id = l.sdr_id
    ${tagId ? sql`WHERE ct.tag_id = ${tagId}` : sql``}
    ORDER BY ct.tagged_at DESC
  `);

  const csv = toCSV(result as any[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-por-tag-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
