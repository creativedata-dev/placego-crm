/**
 * Sincroniza um usuário da tabela users que não existe no Supabase Auth.
 * Cria o auth user com o mesmo ID do banco para manter consistência.
 * Uso: npx tsx src/db/sync-auth-user.ts <email>
 */
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
  if (!email) {
    console.error("Uso: npx tsx src/db/sync-auth-user.ts <email>");
    process.exit(1);
  }

  // Buscar usuário no banco
  const [dbUser] = await sql`SELECT id, email, name FROM users WHERE email = ${email} LIMIT 1`;
  if (!dbUser) {
    console.error("Usuário não encontrado na tabela users:", email);
    process.exit(1);
  }

  console.log("Usuário no banco:", dbUser.id, dbUser.email);

  // Verificar se já existe no Auth
  const { data: existing } = await supabase.auth.admin.getUserById(dbUser.id);
  if (existing?.user) {
    console.log("Usuário já existe no Auth com o mesmo ID. OK.");
    await sql.end();
    process.exit(0);
  }

  // Criar no Auth com o mesmo ID do banco
  const { data, error } = await supabase.auth.admin.createUser({
    id: dbUser.id,
    email: dbUser.email,
    email_confirm: true,
    password: Math.random().toString(36).slice(-12) + "A1!",
    user_metadata: { name: dbUser.name },
  });

  if (error) {
    console.error("Erro ao criar no Auth:", error.message);
    process.exit(1);
  }

  console.log("Auth user criado:", data.user?.id, data.user?.email);
  console.log("Agora pode usar Reset Senha normalmente.");

  await sql.end();
  process.exit(0);
}

run().catch(console.error);
