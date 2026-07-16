import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });

async function run() {
  await sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS whatsapp_message_id text`;
  await sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS ack integer DEFAULT 0`;
  console.log("Colunas adicionadas: whatsapp_message_id, ack");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
