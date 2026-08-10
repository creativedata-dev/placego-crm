import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE lead_assignments ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false`;
  console.log("done");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
