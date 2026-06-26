import { db } from "@/db";
import { users, sdrAssignments } from "@/db/schema";
import { eq, count, and, gte } from "drizzle-orm";
import { sql } from "drizzle-orm";

/**
 * Retorna o ID do próximo SDR disponível via round-robin.
 * Critério: menor número de assignments nas últimas 24h.
 * Em caso de empate, usa sdr_sequence_order.
 */
export async function getNextSdrId(): Promise<string | null> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const result = await db.execute(sql`
    SELECT u.id
    FROM users u
    LEFT JOIN sdr_assignments sa ON sa.sdr_id = u.id
      AND sa.assigned_at >= ${since}
    WHERE u.role = 'sdr' AND u.is_active = true
    GROUP BY u.id, u.sdr_sequence_order
    ORDER BY COUNT(sa.id) ASC, u.sdr_sequence_order ASC
    LIMIT 1
  `);

  const row = (result as any[])[0];
  return row?.id ?? null;
}

/**
 * Atribui um contato ao próximo SDR e cria o sdr_assignment.
 * Retorna o ID do SDR atribuído ou null se não há SDRs.
 */
export async function assignContactToNextSdr(contactId: string): Promise<string | null> {
  const sdrId = await getNextSdrId();
  if (!sdrId) return null;

  await db.insert(sdrAssignments).values({
    contactId,
    sdrId,
    status: "novo",
  });

  return sdrId;
}
