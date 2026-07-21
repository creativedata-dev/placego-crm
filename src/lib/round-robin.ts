import { db } from "@/db";
import { users, sdrAssignments } from "@/db/schema";
import { sql } from "drizzle-orm";

/**
 * Retorna o ID do próximo SDR disponível via round-robin.
 * Se tenantId for fornecido, restringe aos SDRs da mesma empresa.
 * Critério: menor número de assignments nas últimas 24h.
 * Em caso de empate, usa sdr_sequence_order.
 */
export async function getNextSdrId(tenantId?: string | null): Promise<string | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const tenantFilter = tenantId
    ? sql`AND u.tenant_id = ${tenantId}`
    : sql`AND u.tenant_id IS NULL`;

  const result = await db.execute(sql`
    SELECT u.id
    FROM users u
    LEFT JOIN sdr_assignments sa ON sa.sdr_id = u.id
      AND sa.assigned_at >= ${since}
    WHERE u.role = 'sdr' AND u.is_active = true ${tenantFilter}
    GROUP BY u.id, u.sdr_sequence_order
    ORDER BY COUNT(sa.id) ASC, u.sdr_sequence_order ASC
    LIMIT 1
  `);

  const row = (result as any[])[0];

  // Fallback: se não há SDRs para o tenant, usa pool global
  if (!row && tenantId) {
    const fallback = await db.execute(sql`
      SELECT u.id
      FROM users u
      LEFT JOIN sdr_assignments sa ON sa.sdr_id = u.id
        AND sa.assigned_at >= ${since}
      WHERE u.role = 'sdr' AND u.is_active = true
      GROUP BY u.id, u.sdr_sequence_order
      ORDER BY COUNT(sa.id) ASC, u.sdr_sequence_order ASC
      LIMIT 1
    `);
    return (fallback as any[])[0]?.id ?? null;
  }

  return row?.id ?? null;
}

/**
 * Atribui um contato ao próximo SDR e cria o sdr_assignment.
 * Retorna o ID do SDR atribuído ou null se não há SDRs.
 */
export async function assignContactToNextSdr(contactId: string, tenantId?: string | null): Promise<string | null> {
  const sdrId = await getNextSdrId(tenantId);
  if (!sdrId) return null;

  await db.insert(sdrAssignments).values({
    contactId,
    sdrId,
    status: "novo",
  });

  return sdrId;
}
