import { NextResponse } from "next/server";
import { db } from "@/db";
import { tenants, contactMessages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ingestContactMessage } from "@/lib/contact-ingestion";
import { getMediaBase64 } from "@/lib/evolution";
import { createClient } from "@supabase/supabase-js";

const ACK_MAP: Record<string, number> = {
  PENDING: 0,
  SERVER_ACK: 1,
  DELIVERY_ACK: 2,
  READ: 3,
  PLAYED: 3,
  ERROR: -1,
};

const MEDIA_TYPES: Record<string, string> = {
  imageMessage: "image",
  audioMessage: "audio",
  videoMessage: "video",
  documentMessage: "document",
  documentWithCaptionMessage: "document",
  stickerMessage: "image",
  pttMessage: "audio",
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a",
  "video/mp4": "mp4", "video/mpeg": "mpeg",
  "application/pdf": "pdf",
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function uploadMediaToStorage(
  base64: string,
  mimeType: string,
  folder: string
): Promise<string | null> {
  try {
    const ext = MIME_EXT[mimeType] ?? "bin";
    const fileName = `${folder}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(base64, "base64");

    const supabase = supabaseAdmin();
    const { error } = await supabase.storage
      .from("contact-media")
      .upload(fileName, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      console.error("[webhook/evolution] storage upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from("contact-media").getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error("[webhook/evolution] uploadMedia error:", err);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, instance, data } = body;

    // ACK update — atualiza status da mensagem enviada
    if (event === "messages.update") {
      const updates = Array.isArray(data) ? data : [data];
      for (const update of updates) {
        const msgId = update?.key?.id;
        const ackStr = update?.update?.status ?? update?.status;
        const ack = ackStr !== undefined ? (ACK_MAP[ackStr] ?? Number(ackStr)) : null;
        if (msgId && ack !== null) {
          await db.update(contactMessages)
            .set({ ack })
            .where(eq(contactMessages.whatsappMessageId, msgId));
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (event !== "messages.upsert") return NextResponse.json({ ok: true });
    if (data?.key?.fromMe) return NextResponse.json({ ok: true });
    if (data?.messageType === "protocolMessage") return NextResponse.json({ ok: true });

    const slug = instance?.replace("placego-", "");
    if (!slug) return NextResponse.json({ ok: true });

    const [tenant] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    const remoteJid = data?.key?.remoteJid ?? "";
    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "");
    if (!phone || remoteJid.includes("@g.us")) return NextResponse.json({ ok: true });

    const pushName = data?.pushName ?? data?.notifyName ?? "Sem nome";
    const instanceName = `placego-${slug}`;

    // Detectar tipo de mensagem
    const messageType = data?.messageType ?? "";
    const mediaType = MEDIA_TYPES[messageType];

    let messageText = "";
    let mediaUrl: string | null = null;
    let detectedMediaType: string | null = null;

    if (mediaType) {
      // Mensagem de mídia — fazer download via Evolution API
      detectedMediaType = mediaType;
      const msgObj = data?.message?.[messageType] ?? {};
      const caption = msgObj.caption ?? "";
      messageText = caption || `[${mediaType}]`;

      try {
        const instanceSlug = `placego-${slug}`;
        const b64res = await getMediaBase64(instanceSlug, data.key);
        if (b64res?.base64) {
          const mimeType = msgObj.mimetype ?? (
            mediaType === "audio" ? "audio/ogg" :
            mediaType === "image" ? "image/jpeg" :
            mediaType === "video" ? "video/mp4" : "application/octet-stream"
          );
          mediaUrl = await uploadMediaToStorage(b64res.base64, mimeType, `whatsapp/${phone}`);
        }
      } catch (err) {
        console.error("[webhook/evolution] getMediaBase64 error:", err);
      }
    } else {
      // Mensagem de texto
      messageText = data?.message?.conversation
        ?? data?.message?.extendedTextMessage?.text
        ?? "[mensagem]";
    }

    await ingestContactMessage({
      name: pushName,
      phone,
      origin: "whatsapp",
      channel: "whatsapp",
      tenantId: tenant?.id ?? null,
      qualityScore: 65,
      messageContent: messageText,
      mediaUrl: mediaUrl ?? undefined,
      mediaType: detectedMediaType ?? undefined,
    });

    console.log(`[webhook/evolution] ${pushName} (${phone}) — ${detectedMediaType ?? "text"}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[webhook/evolution]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
