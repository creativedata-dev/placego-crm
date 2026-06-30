import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, companyChannels, contactMessages } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { assignContactToNextSdr } from "@/lib/round-robin";

// Webhook do Resend para emails recebidos (evento email.received)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Resend envia { type: "email.received", data: { ... } }
    if (body.type !== "email.received") {
      return NextResponse.json({ ok: true });
    }

    const email = body.data ?? body;

    const fromEmail: string = email.from ?? email.sender ?? "";
    const fromName: string = email.sender_name ?? email.from_name ?? fromEmail.split("@")[0];
    const toAddress: string = Array.isArray(email.to) ? email.to[0] : email.to ?? "";
    const subject: string = email.subject ?? "";
    const text: string = email.plain_text ?? email.text ?? email.body ?? "";

    if (!fromEmail) return NextResponse.json({ ok: true });

    // Identificar empresa pelo endereço de destino
    const allEmailChannels = await db
      .select({ companyId: companyChannels.companyId, config: companyChannels.config })
      .from(companyChannels)
      .where(and(eq(companyChannels.channelType, "email"), eq(companyChannels.isActive, true)));

    const matchedChannel = allEmailChannels.find((ch) => {
      const cfg = ch.config as any;
      return cfg?.address && toAddress.toLowerCase().includes(cfg.address.toLowerCase());
    });

    // Deduplicação: mesmo email nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.email, fromEmail), gte(leads.createdAt, thirtyDaysAgo)))
      .limit(1);

    const messageContent = subject ? `${subject}\n\n${text}` : text;

    if (existing) {
      await db.insert(contactMessages).values({
        contactId: existing.id,
        channel: "email",
        direction: "in",
        content: messageContent,
      });
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const score = 60 + (fromName && fromName !== fromEmail.split("@")[0] ? 20 : 0);

    const [contact] = await db.insert(leads).values({
      name: fromName,
      phone: null,
      email: fromEmail,
      origin: "email",
      stage: "contato",
      status: "new",
      tenantId: matchedChannel?.companyId ?? null,
      qualityScore: score,
    }).returning();

    await db.insert(contactMessages).values({
      contactId: contact.id,
      channel: "email",
      direction: "in",
      content: messageContent,
    });

    await assignContactToNextSdr(contact.id);

    console.log(`[email/inbound] Novo contato: ${fromName} <${fromEmail}>`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[email/inbound]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
