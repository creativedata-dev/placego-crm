import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS state text`;
  console.log("✓ Colunas city e state adicionadas à tabela leads");
  await sql.end();
  process.exit(0);
}

run().catch(console.error);
