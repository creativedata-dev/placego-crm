import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log("[auth/callback] params:", Object.fromEntries(searchParams.entries()));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] exchange error:", error?.message);
    console.log("[auth/callback] user email:", data?.user?.email);
    console.log("[auth/callback] type param:", type);

    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
