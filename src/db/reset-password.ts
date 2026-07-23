import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function run() {
  const { data: list, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) { console.error("Erro ao listar:", listError.message); process.exit(1) }

  const user = list?.users?.find(u => u.email === "ervin.sdr@placego.com.br")
  if (!user) { console.error("Usuário não encontrado"); process.exit(1) }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: "PlaceGo@2025!" })
  if (error) { console.error("Erro ao atualizar senha:", error.message); process.exit(1) }

  console.log("✓ Senha atualizada com sucesso!")
  console.log("  Email: ervin.sdr@placego.com.br")
  console.log("  Senha: PlaceGo@2025!")
  process.exit(0)
}

run().catch(console.error)
