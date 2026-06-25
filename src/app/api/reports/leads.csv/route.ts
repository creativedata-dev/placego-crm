import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, users, properties } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

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

  const rows = await db
    .select({
      id: leads.id,
      nome: leads.name,
      telefone: leads.phone,
      email: leads.email,
      origem: leads.origin,
      status: leads.status,
      score: leads.qualityScore,
      campanha: leads.campaignId,
      utm_source: leads.utmSource,
      utm_campaign: leads.utmCampaign,
      sdr: users.name,
      criado_em: leads.createdAt,
      qualificado_em: leads.qualifiedAt,
    })
    .from(leads)
    .leftJoin(users, eq(leads.sdrId, users.id))
    .orderBy(leads.createdAt);

  const csv = toCSV(rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
