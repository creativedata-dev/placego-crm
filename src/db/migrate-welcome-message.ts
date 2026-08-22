import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`
    ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS meta_welcome_message text
  `;
  console.log("✓ coluna meta_welcome_message adicionada");
  await sql.end();
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
