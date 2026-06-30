import { NextResponse } from "next/server";
import { db } from "@/db";
import { companyChannels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";

// Webhook unificado do Meta para o app PlaceGo CRM (ID: 1689147582125041)
// Recebe: messages (Instagram DM, Facebook Messenger) e feed (comentários)
// Documentação: https://developers.facebook.com/docs/graph-api/webhooks

// Verificação do webhook (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Recebimento de eventos (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();

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

async function resolveTenantByPageId(pageId: string, channelType: string): Promise<string | null> {
  // config armazena { page_id, access_token } — busca todos os ativos e compara
  const allActive = await db
    .select({ companyId: companyChannels.companyId, config: companyChannels.config })
    .from(companyChannels)
    .where(and(eq(companyChannels.channelType, channelType as any), eq(companyChannels.isActive, true)));

  const found = allActive.find((ch) => (ch.config as any)?.page_id === pageId);
  return found?.companyId ?? null;
}
