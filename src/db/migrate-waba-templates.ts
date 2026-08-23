import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_reactivation_template text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_distribution_template text`;
  console.log("OK: meta_reactivation_template, meta_distribution_template adicionadas");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
