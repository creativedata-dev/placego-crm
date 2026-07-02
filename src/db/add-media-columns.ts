import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS media_url text`;
  await sql`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS media_type text`;
  console.log("colunas adicionadas");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
