import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE sdr_assignments ADD COLUMN IF NOT EXISTS last_interaction_at timestamp`;
  // Preencher com o sentAt da última mensagem de cada contato
  await sql`
    UPDATE sdr_assignments sa
    SET last_interaction_at = (
      SELECT MAX(cm.sent_at)
      FROM contact_messages cm
      WHERE cm.contact_id = sa.contact_id
    )
  `;
  // Onde não tem mensagem, usar assigned_at
  await sql`
    UPDATE sdr_assignments
    SET last_interaction_at = assigned_at
    WHERE last_interaction_at IS NULL
  `;
  console.log("coluna last_interaction_at adicionada e populada");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
