import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: "require" });

async function run() {
  const email = process.argv[2];
  if (!email) { console.error("Uso: npx tsx src/db/check-auth-user.ts <email>"); process.exit(1); }

  const [dbUser] = await sql`SELECT id, email FROM users WHERE email = ${email} LIMIT 1`;
  console.log("DB user:", dbUser);

  const { data: byId } = await supabase.auth.admin.getUserById(dbUser?.id);
  console.log("Auth by ID:", byId?.user?.id, byId?.user?.email);

  // Tentar gerar link
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: "https://crm.placego.com.br/auth/callback?type=recovery" },
  });
  console.log("generateLink error:", error?.message);
  console.log("generateLink link:", data?.properties?.action_link?.slice(0, 80));

  await sql.end();
}

run().catch(console.error);
