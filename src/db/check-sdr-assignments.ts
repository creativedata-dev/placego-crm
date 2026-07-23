import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  const sdrs = await sql`SELECT id, name, email, tenant_id FROM users WHERE role = 'sdr' ORDER BY name`;
  console.log("SDRs:", JSON.stringify(sdrs, null, 2));

  const tenants = await sql`SELECT id, name FROM tenants ORDER BY name`;
  console.log("Tenants:", JSON.stringify(tenants, null, 2));

  // Contatos da Tatiana que vieram do Alvorada (tenant)
  const alvoradaId = tenants.find((t: any) => t.name.toLowerCase().includes("alvorada"))?.id;
  const tatianaId = sdrs.find((s: any) => s.name.toLowerCase().includes("tatiana"))?.id;
  const juliaId = sdrs.find((s: any) => s.name.toLowerCase().includes("julia"))?.id;

  console.log("Alvorada ID:", alvoradaId);
  console.log("Tatiana ID:", tatianaId);
  console.log("Julia ID:", juliaId);

  if (alvoradaId && tatianaId) {
    const assignments = await sql`
      SELECT sa.id, sa.contact_id, sa.sdr_id, sa.status, l.name as contact_name, l.tenant_id
      FROM sdr_assignments sa
      JOIN leads l ON l.id = sa.contact_id
      WHERE sa.sdr_id = ${tatianaId}
        AND l.tenant_id = ${alvoradaId}
        AND sa.status NOT IN ('arquivado', 'distribuido')
      ORDER BY sa.assigned_at
    `;
    console.log(`Assignments da Tatiana para Alvorada (${assignments.length}):`, JSON.stringify(assignments, null, 2));
  }

  await sql.end();
  process.exit(0);
}

run().catch(console.error);
