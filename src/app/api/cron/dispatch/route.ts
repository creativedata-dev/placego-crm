import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messageDispatchQueue, contactOptouts, tenants } from "@/db/schema";
import { eq, and, lte, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { sendTemplate, sendText } from "@/lib/meta-waba";

export const runtime = "nodejs";
export const maxDuration = 60;

function buildTemplateComponents(params: Record<string, string>): object[] {
  const entries = Object.values(params);
  if (entries.length === 0) return [];
  return [
    {
      type: "body",
      parameters: entries.map((v) => ({ type: "text", text: v })),
    },
  ];
}

export async function GET(req: NextRequest) {
  // Segurança: só aceita chamadas do Vercel Cron ou com CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Busca itens pendentes agendados para agora ou antes
  const pending = await db
    .select()
    .from(messageDispatchQueue)
    .where(
      and(
        eq(messageDispatchQueue.status, "pending"),
        lte(messageDispatchQueue.scheduledAt, new Date(now))
      )
    )
    .limit(50);

  if (pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Agrupa por tenant para buscar tokens em batch
  const tenantIds = [...new Set(pending.map((p) => p.tenantId))];
  const tenantRows = await db
    .select({
      id: tenants.id,
      metaPhoneNumberId: tenants.metaPhoneNumberId,
      metaAccessToken: tenants.metaAccessToken,
    })
    .from(tenants)
    .where(sql`${tenants.id} = ANY(ARRAY[${sql.join(tenantIds.map((id) => sql`${id}::uuid`), sql`, `)}])`);

  const tenantMap = new Map(tenantRows.map((t) => [t.id, t]));

  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    const tenant = tenantMap.get(item.tenantId);
    if (!tenant?.metaPhoneNumberId || !tenant?.metaAccessToken) {
      await db
        .update(messageDispatchQueue)
        .set({ status: "failed", error: "tenant sem Meta Cloud configurado", sentAt: new Date() })
        .where(eq(messageDispatchQueue.id, item.id));
      failed++;
      continue;
    }

    // Verificar opt-out (global ou por tenant)
    const optout = await db
      .select({ id: contactOptouts.id })
      .from(contactOptouts)
      .where(
        and(
          eq(contactOptouts.phone, item.toPhone),
          or(isNull(contactOptouts.tenantId), eq(contactOptouts.tenantId, item.tenantId))
        )
      )
      .limit(1);

    if (optout.length > 0) {
      await db
        .update(messageDispatchQueue)
        .set({ status: "blocked_optout", sentAt: new Date() })
        .where(eq(messageDispatchQueue.id, item.id));
      continue;
    }

    try {
      if (item.templateName) {
        const params = (item.templateParams as Record<string, string> | null) ?? {};
        const components = buildTemplateComponents(params);
        await sendTemplate(
          tenant.metaPhoneNumberId,
          tenant.metaAccessToken,
          item.toPhone,
          item.templateName,
          "pt_BR",
          components
        );
      } else if (item.messageText) {
        await sendText(
          tenant.metaPhoneNumberId,
          tenant.metaAccessToken,
          item.toPhone,
          item.messageText
        );
      }

      await db
        .update(messageDispatchQueue)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(messageDispatchQueue.id, item.id));
      sent++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const status = errMsg.toLowerCase().includes("quota") ? "quota_exceeded" : "failed";
      await db
        .update(messageDispatchQueue)
        .set({ status, error: errMsg.slice(0, 500), sentAt: new Date() })
        .where(eq(messageDispatchQueue.id, item.id));
      failed++;
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed });
}
