import { NextResponse } from "next/server";
import { db } from "@/db";
import { companyChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";

// Webhook do Forward Email (forwardemail.net) para emails recebidos
// Configurado via registro TXT: forward-email=alias:https://crm.placego.com.br/api/email/inbound
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log do payload bruto — usado para mapear o formato real do Forward Email
    console.log("[email/inbound] payload bruto:", JSON.stringify(body).slice(0, 2000));

    // Extrai remetente — tenta os formatos mais comuns de parsers de email
    const fromRaw: string =
      body.from?.text ?? body.from?.address ?? body.from ??
      body.sender?.text ?? body.sender?.address ?? body.sender ??
      body.envelope?.from ?? "";

    // Extrai apenas o endereço de email de strings tipo "Nome <email@x.com>"
    const emailMatch = (fromRaw as string).match(/<([^>]+)>/) ?? (fromRaw as string).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    const fromEmail = emailMatch ? emailMatch[emailMatch.length === 1 ? 0 : 1] : fromRaw;

    // Nome do remetente (se vier separado do email)
    const nameMatch = (fromRaw as string).match(/^"?([^"<]+)"?\s*</);
    const fromName = (nameMatch?.[1]?.trim()) || (fromEmail as string)?.split("@")[0] || "Sem nome";

    const toRaw: string =
      body.to?.text ?? body.to?.address ?? body.to ??
      body.envelope?.to?.[0] ?? body.recipient ?? "";
    const toAddress = Array.isArray(toRaw) ? toRaw[0] : toRaw;

    const subject: string = body.subject ?? "";
    const text: string =
      body.text ?? body.textBody ?? body.plain ?? body.body_plain ??
      body.html ?? body.htmlBody ?? "";

    if (!fromEmail) {
      console.log("[email/inbound] sem remetente identificável, ignorando");
      return NextResponse.json({ ok: true });
    }

    // Identificar empresa pelo endereço de destino
    const allEmailChannels = await db
      .select({ companyId: companyChannels.companyId, config: companyChannels.config })
      .from(companyChannels)
      .where(and(eq(companyChannels.channelType, "email"), eq(companyChannels.isActive, true)));

    const matchedChannel = allEmailChannels.find((ch) => {
      const cfg = ch.config as any;
      return cfg?.address && (toAddress as string)?.toLowerCase().includes(cfg.address.toLowerCase());
    });

    const score = 60 + (fromName && fromName !== (fromEmail as string).split("@")[0] ? 20 : 0);
    const messageContent = subject ? `${subject}\n\n${text}` : text;

    const result = await ingestContactMessage({
      name: fromName,
      email: fromEmail as string,
      origin: "email",
      channel: "email",
      tenantId: matchedChannel?.companyId ?? null,
      qualityScore: score,
      messageContent,
    });

    console.log(`[email/inbound] ${result.isNew ? "Novo" : "Mensagem de"} contato: ${fromName} <${fromEmail}>`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[email/inbound] erro:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
