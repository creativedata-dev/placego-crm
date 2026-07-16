import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });

async function run() {
  const rows = await sql`SELECT id, name, slug FROM tenants ORDER BY created_at DESC`;
  for (const r of rows) {
    console.log(`name: ${r.name} | slug: ${r.slug} | instancia esperada: placego-${r.slug}`);
  }
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
