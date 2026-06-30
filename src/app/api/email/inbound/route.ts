import { NextResponse } from "next/server";
import { db } from "@/db";
import { companyChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";

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

    const score = 60 + (fromName && fromName !== fromEmail.split("@")[0] ? 20 : 0);
    const messageContent = subject ? `${subject}\n\n${text}` : text;

    const result = await ingestContactMessage({
      name: fromName,
      email: fromEmail,
      origin: "email",
      channel: "email",
      tenantId: matchedChannel?.companyId ?? null,
      qualityScore: score,
      messageContent,
    });

    console.log(`[email/inbound] ${result.isNew ? "Novo" : "Mensagem de"} contato: ${fromName} <${fromEmail}>`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[email/inbound]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
