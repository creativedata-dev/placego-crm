import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  const JULIA_ID = "4bc1b42f-60bd-49e3-9229-bff9d72ddbc5";
  const TATI_ID_ROW = await sql`SELECT id FROM users WHERE name ILIKE '%tatiana tosi%' AND role = 'sdr' LIMIT 1`;
  const TATI_ID = TATI_ID_ROW[0]?.id;
  const CLUBE_ID = "16ee604f-0f46-4203-a6a9-62b6c74e0b86";

  if (!TATI_ID) throw new Error("Tatiana não encontrada");
  console.log("Tatiana ID:", TATI_ID);

  // Assignments da Julia em contatos do Clube Ancestral
  const errados = await sql`
    SELECT sa.id
    FROM sdr_assignments sa
    JOIN leads c ON c.id = sa.contact_id
    WHERE sa.sdr_id = ${JULIA_ID}
      AND c.tenant_id = ${CLUBE_ID}
  `;

  console.log(`Reatribuindo ${errados.length} assignments para Tatiana...`);

  for (const row of errados) {
    await sql`
      UPDATE sdr_assignments
      SET sdr_id = ${TATI_ID}
      WHERE id = ${row.id}
    `;
    console.log("  ✓", row.id);
  }

  // Atualizar também o campo sdr_id na tabela leads para esses contatos
  const result = await sql`
    UPDATE leads
    SET sdr_id = ${TATI_ID}
    WHERE tenant_id = ${CLUBE_ID}
      AND sdr_id = ${JULIA_ID}
    RETURNING id, name
  `;
  console.log(`\nContatos atualizados (leads.sdr_id):`);
  result.forEach((r) => console.log(" ", r.name, r.id));

  console.log("\nConcluído.");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
