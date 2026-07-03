import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const users = await sql`SELECT id, name, email FROM users WHERE name IN ('ERVIN MORIYAMA 2', 'Amanda SDR')`;
  console.log("Usuários encontrados:", JSON.stringify(users, null, 2));

  const ids = users.map((u: any) => u.id);
  if (ids.length === 0) { console.log("nenhum encontrado"); await sql.end(); process.exit(0); }

  // sdr_assignments: deletar os assignments (e em cascata contact_messages via FK não existe — só leads tem cascade)
  // Primeiro pegar os contact_ids dos assignments destes SDRs para poder apagar os leads também
  const assignedContacts = await sql`SELECT contact_id FROM sdr_assignments WHERE sdr_id = ANY(${ids})`;
  const contactIds = assignedContacts.map((r: any) => r.contact_id);

  if (contactIds.length > 0) {
    await sql`DELETE FROM lead_activities WHERE lead_assignment_id IN (SELECT id FROM lead_assignments WHERE lead_id = ANY(${contactIds}))`;
    await sql`DELETE FROM lead_assignments WHERE lead_id = ANY(${contactIds})`;
    await sql`DELETE FROM contact_tags WHERE contact_id = ANY(${contactIds})`;
    await sql`DELETE FROM contact_messages WHERE contact_id = ANY(${contactIds})`;
    await sql`DELETE FROM sdr_assignments WHERE contact_id = ANY(${contactIds})`;
    await sql`DELETE FROM leads WHERE id = ANY(${contactIds})`;
    console.log(`${contactIds.length} contatos/leads dos SDRs deletados`);
  }

  await sql`UPDATE leads SET sdr_id = NULL WHERE sdr_id = ANY(${ids})`;
  await sql`UPDATE contact_messages SET sdr_id = NULL WHERE sdr_id = ANY(${ids})`;
  await sql`UPDATE tags SET created_by = NULL WHERE created_by = ANY(${ids})`;
  await sql`DELETE FROM lead_activities WHERE user_id = ANY(${ids})`;
  await sql`DELETE FROM lead_assignments WHERE broker_id = ANY(${ids}) OR assigned_by_sdr_id = ANY(${ids})`;
  await sql`DELETE FROM broker_preferences WHERE broker_id = ANY(${ids})`;

  // Deletar do Auth e da tabela users
  for (const u of users) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) console.warn(`Auth delete ${u.name}:`, error.message);
  }
  await sql`DELETE FROM users WHERE id = ANY(${ids})`;

  console.log("✓ usuários deletados");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
