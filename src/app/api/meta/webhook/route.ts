import { NextResponse } from "next/server";
import { db } from "@/db";
import { companyChannels, tenants, contactMessages, contactOptouts } from "@/db/schema";
import { eq, and, or, isNull } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";
import { markAsRead } from "@/lib/meta-waba";

// Webhook unificado do Meta para o app PlaceGo CRM (ID: 1689147582125041)
// Recebe: messages (Instagram DM, Facebook Messenger) e feed (comentários)
// Documentação: https://developers.facebook.com/docs/graph-api/webhooks

// Verificação do webhook (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new Response("Bad Request", { status: 400 });
  }

  // Token global
  if (token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  // Token por tenant (WABA)
  const [t] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.metaVerifyToken, token))
    .limit(1);

  if (t) return new Response(challenge, { status: 200 });

  return new Response("Forbidden", { status: 403 });
}

// Recebimento de eventos (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // WABA (WhatsApp Cloud API)
    if (body.object === "whatsapp_business_account") {
      await handleWabaPayload(body);
      return NextResponse.json({ ok: true });
    }

    // Payload padrão Meta: { object: "instagram"|"page", entry: [...] }
    const platform = body.object; // "instagram" | "page"
    const entries = body.entry ?? [];

    for (const entry of entries) {
      const pageId = entry.id;

      // ── Mensagens (DM Instagram/Messenger) ──────────────────────────
      const messaging = entry.messaging ?? [];
      for (const event of messaging) {
        if (event.message?.is_echo) continue; // ignora mensagens enviadas pelo próprio CRM/página

        const senderId = event.sender?.id;
        const text = event.message?.text ?? "[mídia]";
        if (!senderId) continue;

        const channelType = platform === "instagram" ? "instagram_dm" : "facebook_dm";
        const origin = platform === "instagram" ? "meta_dm_instagram" : "meta_dm_facebook";

        const tenantId = await resolveTenantByPageId(pageId, channelType);

        await ingestContactMessage({
          name: `Usuário ${platform === "instagram" ? "Instagram" : "Facebook"}`,
          metaUserId: senderId,
          origin: origin as any,
          channel: channelType as any,
          tenantId,
          qualityScore: 55,
          messageContent: text,
        });
      }

      // ── Comentários (feed) ──────────────────────────────────────────
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "feed") continue;
        const value = change.value;
        if (value.item !== "comment" || value.verb !== "add") continue;

        const commentText: string = value.message ?? "";
        const commenterId = value.from?.id;
        const commenterName = value.from?.name ?? "Comentário";

        if (!commenterId || !commentText) continue;

        const tenantId = await resolveTenantByPageId(pageId, "meta_comment");

        // Filtro de palavras-chave configurado por empresa
        if (tenantId) {
          const [channelConfig] = await db
            .select({ keywords: companyChannels.keywords })
            .from(companyChannels)
            .where(and(eq(companyChannels.companyId, tenantId), eq(companyChannels.channelType, "meta_comment")))
            .limit(1);

          const keywords = channelConfig?.keywords ?? [];
          if (keywords.length > 0) {
            const matches = keywords.some((kw) => commentText.toLowerCase().includes(kw.toLowerCase()));
            if (!matches) continue; // ignora comentário sem palavra-chave de interesse
          }
        }

        await ingestContactMessage({
          name: commenterName,
          metaUserId: commenterId,
          origin: "meta_comment",
          channel: "comment",
          tenantId,
          qualityScore: 40,
          messageContent: commentText,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/meta]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── WABA handlers ────────────────────────────────────────────────────────────

const DEFAULT_OPTOUT_KEYWORDS = ["PARAR", "STOP", "CANCELAR", "SAI", "SAIR", "NAO QUERO", "NÃO QUERO"];

async function handleWabaPayload(body: any) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.metaPhoneNumberId, phoneNumberId))
        .limit(1);

      if (!tenant) continue;

      for (const status of value.statuses ?? []) {
        await handleWabaStatus(status);
      }

      for (const msg of value.messages ?? []) {
        await handleWabaMessage(msg, value.contacts?.[0], tenant, phoneNumberId);
      }
    }
  }
}

async function handleWabaStatus(status: any) {
  // ack: 0=pending, 1=sent, 2=delivered, 3=read, -1=error
  const ackMap: Record<string, number> = { sent: 1, delivered: 2, read: 3, failed: -1 };
  const ack = ackMap[status.status];
  if (ack === undefined || !status.id) return;
  await db.update(contactMessages).set({ ack }).where(eq(contactMessages.whatsappMessageId, status.id)).catch(() => {});
}

async function handleWabaMessage(
  msg: any,
  metaContact: any,
  tenant: typeof tenants.$inferSelect,
  phoneNumberId: string
) {
  const fromPhone = msg.from;
  const messageId = msg.id;

  if (tenant.metaAccessToken) {
    markAsRead(phoneNumberId, tenant.metaAccessToken, messageId).catch(() => {});
  }

  const text = extractWabaText(msg);
  if (!text) return;

  // Opt-out por palavra-chave
  const keywords = (tenant.metaOptoutKeywords as string[] | null) ?? DEFAULT_OPTOUT_KEYWORDS;
  const normalized = text.trim().toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const isOptout = keywords.some((kw) =>
    normalized.includes(kw.toUpperCase().normalize("NFD").replace(/\p{Diacritic}/gu, ""))
  );
  if (isOptout) {
    const [existing] = await db
      .select({ id: contactOptouts.id })
      .from(contactOptouts)
      .where(and(eq(contactOptouts.phone, fromPhone), eq(contactOptouts.tenantId, tenant.id)))
      .limit(1);
    if (!existing) {
      await db.insert(contactOptouts).values({ phone: fromPhone, tenantId: tenant.id, source: "keyword" });
    }
    return;
  }

  // Bloqueia se já está em opt-out
  const [optout] = await db
    .select({ id: contactOptouts.id })
    .from(contactOptouts)
    .where(or(
      and(eq(contactOptouts.phone, fromPhone), eq(contactOptouts.tenantId, tenant.id)),
      and(eq(contactOptouts.phone, fromPhone), isNull(contactOptouts.tenantId))
    ))
    .limit(1);
  if (optout) return;

  const contactName = metaContact?.profile?.name ?? fromPhone;

  // ingestContactMessage: dedup + cria contato + round-robin + push SDR + salva mensagem
  await ingestContactMessage({
    name: contactName,
    phone: fromPhone,
    origin: "whatsapp",
    channel: "whatsapp",
    tenantId: tenant.id,
    qualityScore: 60,
    messageContent: text,
  });

  // Atualiza whatsapp_message_id na última mensagem (para ACK)
  if (messageId) {
    await db
      .update(contactMessages)
      .set({ whatsappMessageId: messageId })
      .where(
        and(
          eq(contactMessages.channel, "whatsapp"),
          eq(contactMessages.direction, "in"),
          isNull(contactMessages.whatsappMessageId)
        )
      )
      .catch(() => {});
  }
}

function extractWabaText(msg: any): string | null {
  switch (msg.type) {
    case "text": return msg.text?.body ?? null;
    case "image": return `📷 Imagem${msg.image?.caption ? `: ${msg.image.caption}` : ""}`;
    case "audio":
    case "voice": return "🎵 Áudio";
    case "video": return `🎬 Vídeo${msg.video?.caption ? `: ${msg.video.caption}` : ""}`;
    case "document": return `📄 Documento${msg.document?.filename ? `: ${msg.document.filename}` : ""}`;
    case "sticker": return "🙂 Sticker";
    case "location": return `📍 Localização: https://maps.google.com/?q=${msg.location?.latitude},${msg.location?.longitude}`;
    case "contacts": return `👤 Contato: ${msg.contacts?.[0]?.name?.formatted_name ?? ""}`;
    default: return null;
  }
}

// ── Helpers Instagram/Facebook ────────────────────────────────────────────────

async function resolveTenantByPageId(pageId: string, channelType: string): Promise<string | null> {
  // config armazena { page_id, access_token } — busca todos os ativos e compara
  const allActive = await db
    .select({ companyId: companyChannels.companyId, config: companyChannels.config })
    .from(companyChannels)
    .where(and(eq(companyChannels.channelType, channelType as any), eq(companyChannels.isActive, true)));

  const found = allActive.find((ch) => (ch.config as any)?.page_id === pageId);
  return found?.companyId ?? null;
}
