import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const { data, error } = await supabase.auth.admin.updateUserById(
    "06b5962f-dc4e-4b37-a058-b4bf00dc6f8b",
    { email: "ervin.moriyama@gmail.com", email_confirm: true }
  );
  console.log("error:", error?.message);
  console.log("updated email:", data?.user?.email);
  process.exit(0);
}
run().catch(console.error);
