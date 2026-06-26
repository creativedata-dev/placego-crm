import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, companyChannels, tenants } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { assignContactToNextSdr } from "@/lib/round-robin";

// Resend Inbound envia um POST com os dados do email recebido
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Payload do Resend Inbound
    const to: string = Array.isArray(body.to) ? body.to[0] : body.to ?? "";
    const fromEmail: string = body.from ?? "";
    const fromName: string = body.sender_name ?? fromEmail.split("@")[0];
    const subject: string = body.subject ?? "";
    const text: string = body.plain_text ?? body.text ?? "";

    if (!fromEmail) return NextResponse.json({ ok: true });

    // Identificar empresa pelo endereço de destino
    // Busca em company_channels onde config->>'address' = to
    const allEmailChannels = await db
      .select({ companyId: companyChannels.companyId, config: companyChannels.config })
      .from(companyChannels)
      .where(and(eq(companyChannels.channelType, "email"), eq(companyChannels.isActive, true)));

    const matchedChannel = allEmailChannels.find((ch) => {
      const cfg = ch.config as any;
      return cfg?.address && to.toLowerCase().includes(cfg.address.toLowerCase());
    });

    const tenantId = matchedChannel?.companyId ?? null;

    // Deduplicação: mesmo email nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.email, fromEmail), gte(leads.createdAt, thirtyDaysAgo)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Score: email sempre tem nome + email
    const score = 60 + (fromName && fromName !== fromEmail.split("@")[0] ? 20 : 0);

    // Criar contato
    const [contact] = await db.insert(leads).values({
      name: fromName,
      phone: null,
      email: fromEmail,
      origin: "email",
      stage: "contato",
      status: "new",
      tenantId,
      qualityScore: score,
      notes: subject ? `Assunto: ${subject}${text ? `\n\n${text.slice(0, 300)}` : ""}` : null,
    }).returning();

    // Round-robin
    await assignContactToNextSdr(contact.id);

    console.log(`[email/inbound] Novo contato: ${fromName} <${fromEmail}>`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[email/inbound]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
