import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });

async function run() {
  const rows = await sql`SELECT id, name, slug, webhook_token FROM companies ORDER BY created_at DESC`;
  console.log("Empresas no banco:");
  for (const r of rows) {
    console.log(`  name: ${r.name}`);
    console.log(`  slug: ${r.slug}`);
    console.log(`  instância esperada: placego-${r.slug}`);
    console.log("");
  }
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
