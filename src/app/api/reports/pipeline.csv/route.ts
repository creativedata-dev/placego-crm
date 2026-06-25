import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, leadAssignments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  await requireRole(["admin_placego", "sdr"]);

  const result = await db.execute(sql`
    SELECT
      la.id AS assignment_id,
      l.name AS lead_nome,
      l.phone AS lead_telefone,
      u_broker.name AS corretor,
      u_sdr.name AS sdr,
      la.status AS etapa,
      la.loss_reason AS motivo_perda,
      la.assigned_at AS atribuido_em,
      la.updated_at AS atualizado_em,
      la.notes AS observacoes
    FROM lead_assignments la
    JOIN leads l ON l.id = la.lead_id
    JOIN users u_broker ON u_broker.id = la.broker_id
    LEFT JOIN users u_sdr ON u_sdr.id = la.assigned_by_sdr_id
    ORDER BY la.assigned_at DESC
  `);

  const csv = toCSV(result as any[]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pipeline-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
