import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const email = "tati@pluggedresearch.com";
  const newPassword = "PlaceGo@2026!";

  const { data, error } = await supabase.auth.admin.updateUserById(
    "061e8b47-19d9-4ef4-b64e-3e02c95fbcee",
    { password: newPassword }
  );

  if (error) { console.error("Erro:", error.message); process.exit(1); }
  console.log("Senha atualizada para:", data.user.email);
  console.log("Nova senha:", newPassword);
  process.exit(0);
}
run().catch(console.error);
