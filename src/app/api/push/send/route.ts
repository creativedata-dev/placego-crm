import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId, title, body, url } = await req.json();
  if (!userId || !body) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  if (subs.length === 0) return NextResponse.json({ sent: 0 });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: title ?? "PlaceGo CRM", body, url: url ?? "/", icon: "/icon-192.png" })
      )
    )
  );

  // Remove subscriptions expiradas
  const expired = subs
    .filter((_, i) => {
      const r = results[i];
      return r.status === "rejected" && (r.reason as any)?.statusCode === 410;
    })
    .map((s) => s.endpoint);

  if (expired.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, expired));
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
