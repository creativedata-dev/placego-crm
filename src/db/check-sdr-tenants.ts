import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  const tenants = await sql`SELECT id, name FROM tenants ORDER BY name`;
  console.log("TENANTS:");
  tenants.forEach((t) => console.log(" ", t.id, "|", t.name));

  const sdrs = await sql`SELECT id, name, tenant_id, is_active FROM users WHERE role = 'sdr' ORDER BY name`;
  console.log("\nSDRs:");
  sdrs.forEach((s) => console.log(" ", s.name, "| tenant_id:", s.tenant_id, "| active:", s.is_active));

  // Contatos do Clube Ancestral atribuídos à Julia
  const clube = tenants.find((t) => t.name.toLowerCase().includes("clube"));
  const julia = sdrs.find((s) => s.name.toLowerCase().includes("julia"));

  if (clube && julia) {
    console.log(`\nContatos do Clube Ancestral (${clube.id}) atribuídos à Julia (${julia.id}):`);
    const errados = await sql`
      SELECT c.id, c.name, c.phone, sa.id as assignment_id, sa.status, sa.assigned_at
      FROM sdr_assignments sa
      JOIN leads c ON c.id = sa.contact_id
      WHERE sa.sdr_id = ${julia.id}
        AND c.tenant_id = ${clube.id}
      ORDER BY sa.assigned_at DESC
    `;
    errados.forEach((r) => console.log(" ", r.assignment_id, "|", r.name, "|", r.phone, "|", r.status, "|", r.assigned_at));
    console.log("Total:", errados.length);
  }

  await sql.end();
  process.exit(0);
}
run().catch(console.error);
