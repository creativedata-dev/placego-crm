import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_provider text NOT NULL DEFAULT 'evolution'`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_phone_number_id text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_access_token text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_waba_id text`;
  console.log("✓ Colunas Meta Cloud API adicionadas à tabela tenants");
  await sql.end();
  process.exit(0);
}

run().catch(console.error);
