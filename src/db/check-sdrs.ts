import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });
const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });
async function run() {
  const sdrs = await sql`SELECT id, name, email, role, is_active FROM users WHERE role = 'sdr'`;
  console.log("SDRs:", JSON.stringify(sdrs, null, 2));
  const contacts = await sql`SELECT id, name, phone, created_at FROM leads ORDER BY created_at DESC LIMIT 5`;
  console.log("Últimos leads:", JSON.stringify(contacts, null, 2));
  const orphans = await sql`SELECT l.id, l.name FROM leads l WHERE NOT EXISTS (SELECT 1 FROM sdr_assignments sa WHERE sa.contact_id = l.id)`;
  console.log("Leads sem assignment:", JSON.stringify(orphans, null, 2));
  await sql.end(); process.exit(0);
}
run().catch(console.error);
