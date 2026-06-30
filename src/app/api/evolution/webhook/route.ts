import { NextResponse } from "next/server";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";

// Evolution API envia eventos para este endpoint
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, instance, data } = body;

    // Só processa mensagens recebidas (não enviadas pelo CRM)
    if (event !== "messages.upsert") return NextResponse.json({ ok: true });
    if (data?.key?.fromMe) return NextResponse.json({ ok: true });
    if (data?.messageType === "protocolMessage") return NextResponse.json({ ok: true });

    // Identificar empresa pela instância (placego-{slug})
    const slug = instance?.replace("placego-", "");
    if (!slug) return NextResponse.json({ ok: true });

    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    // Extrair dados do remetente
    const remoteJid = data?.key?.remoteJid ?? "";
    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
    if (!phone || remoteJid.includes("@g.us")) return NextResponse.json({ ok: true }); // ignora grupos

    const pushName = data?.pushName ?? data?.notifyName ?? "Sem nome";
    const messageText = data?.message?.conversation
      ?? data?.message?.extendedTextMessage?.text
      ?? "[mídia]";

    const result = await ingestContactMessage({
      name: pushName,
      phone,
      origin: "whatsapp",
      channel: "whatsapp",
      tenantId: tenant?.id ?? null,
      qualityScore: 65,
      messageContent: messageText,
    });

    console.log(`[webhook/evolution] ${result.isNew ? "Novo" : "Mensagem de"} contato via WhatsApp: ${pushName} (${phone})`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[webhook/evolution]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
