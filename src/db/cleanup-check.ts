import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  const tenants = await sql`SELECT id, name FROM tenants WHERE name IN ('Imóveis Lisboa - teste', 'Construtora Horizonte - teste', 'Incorporadora Nobre - teste')`;
  console.log("TENANTS:", JSON.stringify(tenants, null, 2));

  const brokers = await sql`SELECT id, name, email FROM users WHERE name IN ('Fernanda Souza', 'Juliana Costa', 'Ricardo Alves')`;
  console.log("BROKERS:", JSON.stringify(brokers, null, 2));

  const props = await sql`SELECT COUNT(*) as cnt FROM properties`;
  console.log("PROPERTIES total:", props[0].cnt);

  const leads = await sql`
    SELECT COUNT(*) as cnt FROM leads
    WHERE tenant_id IN (SELECT id FROM tenants WHERE name IN ('Imóveis Lisboa - teste', 'Construtora Horizonte - teste', 'Incorporadora Nobre - teste'))
  `;
  console.log("LEADS vinculados às empresas teste:", leads[0].cnt);

  await sql.end();
  process.exit(0);
}
run().catch(console.error);
