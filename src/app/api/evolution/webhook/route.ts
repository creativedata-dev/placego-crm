import { NextResponse } from "next/server";
import { db } from "@/db";
import { leads, tenants } from "@/db/schema";
import { eq, and, gte, or } from "drizzle-orm";
import { assignContactToNextSdr } from "@/lib/round-robin";

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

    // Deduplicação: já existe contato com esse telefone nos últimos 30 dias?
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.phone, phone), gte(leads.createdAt, thirtyDaysAgo)))
      .limit(1);

    if (existing) {
      // Contato já existe — não cria duplicado
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Criar contato
    const [contact] = await db.insert(leads).values({
      name: pushName,
      phone,
      origin: "whatsapp",
      stage: "contato",
      status: "new",
      tenantId: tenant?.id ?? null,
      qualityScore: 65, // whatsapp tem boa qualidade
      notes: messageText !== "[mídia]" ? `Primeira mensagem: "${messageText}"` : null,
    }).returning();

    // Round-robin: atribuir ao próximo SDR
    await assignContactToNextSdr(contact.id);

    console.log(`[webhook/evolution] Novo contato via WhatsApp: ${pushName} (${phone})`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[webhook/evolution]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
