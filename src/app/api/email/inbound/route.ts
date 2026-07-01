import { NextResponse } from "next/server";
import { db } from "@/db";
import { companyChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";

// Webhook do Forward Email (forwardemail.net)
// TXT: forward-email=https://crm.placego.com.br/api/email/inbound
// Payload: JSON com campos raiz: from, to, subject, text, html, attachments, headers, messageId
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Forward Email envia JSON com campos raiz
    // from/to podem ser string "Nome <email>" ou objeto { text, value[{address,name}] }
    function extractEmail(field: any): { email: string; name: string } {
      if (!field) return { email: "", name: "" };
      if (typeof field === "string") {
        const nameMatch = field.match(/^"?([^"<]+)"?\s*</);
        const emailMatch = field.match(/<([^>]+)>/) ?? field.match(/[\w.+\-]+@[\w\-]+\.[\w.\-]+/);
        return {
          email: emailMatch ? emailMatch[emailMatch.length === 1 ? 0 : 1] : field.trim(),
          name: nameMatch?.[1]?.trim() ?? "",
        };
      }
      // Objeto { text: "Nome <email>", value: [{address, name}] }
      if (field.value?.[0]) {
        return { email: field.value[0].address ?? "", name: field.value[0].name ?? "" };
      }
      if (field.text) return extractEmail(field.text);
      if (field.address) return { email: field.address, name: field.name ?? "" };
      return { email: "", name: "" };
    }

    const { email: fromEmail, name: fromNameRaw } = extractEmail(body.from);
    const fromName = fromNameRaw || fromEmail.split("@")[0] || "Sem nome";

    // to pode ser string, objeto ou array
    const toField = Array.isArray(body.to) ? body.to[0] : body.to;
    const { email: toAddress } = extractEmail(toField);

    const subject: string = body.subject ?? "";
    const text: string = body.text ?? body.html ?? "";

    console.log(`[email/inbound] from="${fromEmail}" name="${fromName}" to="${toAddress}" subject="${subject}"`);

    if (!fromEmail) {
      console.log("[email/inbound] sem remetente, ignorando");
      return NextResponse.json({ ok: true });
    }

    // Identificar empresa pelo endereço de destino
    const allEmailChannels = await db
      .select({ companyId: companyChannels.companyId, config: companyChannels.config })
      .from(companyChannels)
      .where(and(eq(companyChannels.channelType, "email"), eq(companyChannels.isActive, true)));

    const matchedChannel = allEmailChannels.find((ch) => {
      const cfg = ch.config as any;
      return cfg?.address && toAddress?.toLowerCase().includes(cfg.address.toLowerCase());
    });

    const hasRealName = !!fromName && fromName !== fromEmail.split("@")[0];
    const score = (hasRealName ? 20 : 0) + 20;
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

    console.log(`[email/inbound] ${result.isNew ? "✓ NOVO contato" : "✓ mensagem adicionada"}: ${fromName} <${fromEmail}>`);
    return NextResponse.json({ ok: true });

  } catch (err: any) {
    console.error("[email/inbound] ERRO:", err?.message ?? err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
