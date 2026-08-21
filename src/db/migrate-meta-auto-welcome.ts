import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_auto_welcome boolean NOT NULL DEFAULT true`;
  console.log("✅ coluna meta_auto_welcome adicionada");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
