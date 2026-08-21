import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

export async function GET() {
  await requireRole(["admin_placego"]);
  const rows = await db.execute(
    sql`SELECT created_at, step, data FROM webhook_debug_logs ORDER BY created_at DESC LIMIT 50`
  );
  return NextResponse.json(rows);
}

export async function DELETE() {
  await requireRole(["admin_placego"]);
  await db.execute(sql`DELETE FROM webhook_debug_logs`);
  return NextResponse.json({ ok: true });
}
