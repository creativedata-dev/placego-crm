import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  // Buscar SDR ativo
  const [sdr] = await sql`SELECT id FROM users WHERE role = 'sdr' AND is_active = true ORDER BY sdr_sequence_order ASC LIMIT 1`;
  if (!sdr) { console.log("Nenhum SDR ativo"); await sql.end(); process.exit(0); }
  console.log("SDR:", sdr.id);

  // Leads sem assignment
  const orphans = await sql`
    SELECT l.id, l.name FROM leads l
    WHERE NOT EXISTS (SELECT 1 FROM sdr_assignments sa WHERE sa.contact_id = l.id)
  `;
  console.log(`${orphans.length} leads órfãos`);

  for (const lead of orphans) {
    await sql`
      INSERT INTO sdr_assignments (contact_id, sdr_id, status, assigned_at, last_interaction_at, updated_at)
      VALUES (${lead.id}, ${sdr.id}, 'novo', NOW(), NOW(), NOW())
    `;
    console.log(`  assignment criado para: ${lead.name}`);
  }

  console.log("✓ concluído");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
