import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  const tenantIds = [
    "4c108d00-e661-48df-94b3-6a11829d47f9", // Imóveis Lisboa - teste
    "7afbf7b9-f89e-4dd8-8d78-516f1a9edd51", // Construtora Horizonte - teste
    "c7bdf2b4-ba11-422b-b8bc-3833301f8801", // Incorporadora Nobre - teste
  ];
  const brokerIds = [
    "8f6b00ae-50ec-48ef-b078-319e4231b6de", // Fernanda Souza
    "e2f76cea-f216-44ad-ba7f-3ea84144af8c", // Juliana Costa
    "effd718d-d850-4358-bb28-180f8314523a", // Ricardo Alves
  ];

  // 1. Leads vinculados às empresas teste
  const leadRows = await sql`SELECT id FROM leads WHERE tenant_id = ANY(${tenantIds})`;
  const leadIds = leadRows.map((r: any) => r.id);
  console.log(`${leadIds.length} leads para deletar`);

  if (leadIds.length > 0) {
    // Cascade: contact_messages, sdr_assignments, lead_assignments (e lead_activities via FK cascade)
    // lead_assignments tem FK para leads sem cascade — deletar manualmente
    await sql`DELETE FROM lead_activities WHERE lead_assignment_id IN (SELECT id FROM lead_assignments WHERE lead_id = ANY(${leadIds}))`;
    await sql`DELETE FROM lead_assignments WHERE lead_id = ANY(${leadIds})`;
    await sql`DELETE FROM contact_tags WHERE contact_id = ANY(${leadIds})`;
    await sql`DELETE FROM contact_messages WHERE contact_id = ANY(${leadIds})`;
    await sql`DELETE FROM sdr_assignments WHERE contact_id = ANY(${leadIds})`;
    await sql`DELETE FROM leads WHERE id = ANY(${leadIds})`;
    console.log("leads deletados");
  }

  // 2. Leads atribuídos aos corretores demo (não vinculados às empresas, mas atribuídos a eles)
  const brokerLeadRows = await sql`SELECT lead_id FROM lead_assignments WHERE broker_id = ANY(${brokerIds})`;
  const brokerLeadIds = brokerLeadRows.map((r: any) => r.lead_id).filter((id: string) => !leadIds.includes(id));
  if (brokerLeadIds.length > 0) {
    await sql`DELETE FROM lead_activities WHERE lead_assignment_id IN (SELECT id FROM lead_assignments WHERE lead_id = ANY(${brokerLeadIds}))`;
    await sql`DELETE FROM lead_assignments WHERE lead_id = ANY(${brokerLeadIds})`;
    console.log(`${brokerLeadIds.length} leads adicionais dos corretores deletados`);
  }
  // Remover assignments dos corretores demo que restarem
  await sql`DELETE FROM lead_activities WHERE lead_assignment_id IN (SELECT id FROM lead_assignments WHERE broker_id = ANY(${brokerIds}))`;
  await sql`DELETE FROM lead_assignments WHERE broker_id = ANY(${brokerIds})`;

  // 3. Broker preferences dos corretores demo
  await sql`DELETE FROM broker_preferences WHERE broker_id = ANY(${brokerIds})`;

  // 4. Corretores demo do Auth + tabela users
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (const id of brokerIds) {
    await supabase.auth.admin.deleteUser(id);
  }
  await sql`DELETE FROM users WHERE id = ANY(${brokerIds})`;
  console.log("corretores deletados");

  // 5. Todos os imóveis
  await sql`DELETE FROM properties`;
  await sql`DELETE FROM developments`;
  console.log("imóveis deletados");

  // 6. Empresas teste
  await sql`DELETE FROM tenants WHERE id = ANY(${tenantIds})`;
  console.log("empresas deletadas");

  console.log("✓ limpeza concluída");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
