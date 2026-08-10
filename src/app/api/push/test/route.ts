import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifySdrNewContact } from "@/lib/push";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await notifySdrNewContact(user.id, "Maria Oliveira (teste)", "WhatsApp");
  return NextResponse.json({ ok: true });
}
