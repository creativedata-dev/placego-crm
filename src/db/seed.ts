import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { users } from "./schema";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Conexão com IPv4 forçado via pooler
const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: "require",
});
const db = drizzle(sql);

async function seed() {
  const email = "admin@placego.com.br";
  const password = "PlaceGo@2026";

  // Buscar ou criar no Auth
  console.log("Verificando usuário no Supabase Auth...");
  const { data: list } = await supabase.auth.admin.listUsers();
  let userId = list?.users?.find((u) => u.email === email)?.id;

  if (!userId) {
    console.log("Criando usuário admin...");
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user!.id;
  } else {
    console.log("Usuário já existe no Auth, usando ID existente...");
  }

  // Inserir na tabela users
  console.log("Inserindo na tabela users...");
  await db.insert(users).values({
    id: userId,
    email,
    name: "Admin PlaceGo",
    role: "admin_placego",
  }).onConflictDoNothing();

  console.log("\n✓ Admin pronto!");
  console.log(`  Email: ${email}`);
  console.log(`  Senha: ${password}`);
  console.log("  (Altere a senha após o primeiro login)\n");
  await sql.end();
  process.exit(0);
}

seed().catch((e) => {
  console.error("Erro no seed:", e.message ?? e);
  process.exit(1);
});
