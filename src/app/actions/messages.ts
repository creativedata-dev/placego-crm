"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactMessages, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { sendText, sendMedia, sendAudio } from "@/lib/evolution";
import { metaSendText, metaSendMedia } from "@/lib/meta-cloud";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/ogg": "ogg", "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function uploadBase64ToStorage(base64: string, mimeType: string, folder: string) {
  const ext = MIME_EXT[mimeType] ?? "bin";
  const fileName = `${folder}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(base64, "base64");
  const supabase = supabaseAdmin();
  const { error } = await supabase.storage
    .from("contact-media")
    .upload(fileName, buffer, { contentType: mimeType, upsert: false });
  if (error) throw new Error(`Storage upload error: ${error.message}`);
  const { data } = supabase.storage.from("contact-media").getPublicUrl(fileName);
  return data.publicUrl;
}

interface SendMessageParams {
  contactId: string;
  channel: string;
  content: string;
  phone: string | null;
  email: string | null;
  name: string;
  instanceName: string | null;
  tenantId?: string | null;
}

async function getTenantWabaConfig(tenantId: string) {
  const [t] = await db
    .select({ provider: tenants.whatsappProvider, phoneNumberId: tenants.metaPhoneNumberId, accessToken: tenants.metaAccessToken })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return t ?? null;
}

export async function sendContactMessage(params: SendMessageParams) {
  const user = await requireRole(["sdr", "admin_placego", "corretor", "corretor_tenant"]);
  const { contactId, channel, content, phone, email, name, instanceName, tenantId } = params;

  try {
    let whatsappMessageId: string | null = null;

    if (channel === "whatsapp") {
      if (!phone) return { error: "Telefone não cadastrado" };

      // Detectar provider: Meta Cloud API ou Evolution
      const wabaConfig = tenantId ? await getTenantWabaConfig(tenantId) : null;

      if (wabaConfig?.provider === "meta_cloud") {
        if (!wabaConfig.phoneNumberId || !wabaConfig.accessToken) {
          return { error: "Credenciais Meta Cloud não configuradas para esta empresa" };
        }
        const result = await metaSendText(
          { phoneNumberId: wabaConfig.phoneNumberId, accessToken: wabaConfig.accessToken },
          phone,
          content
        );
        whatsappMessageId = result?.messages?.[0]?.id ?? null;
      } else {
        if (!instanceName) return { error: "WhatsApp não configurado para esta empresa" };
        const result = await sendText(instanceName, phone, content);
        whatsappMessageId = result?.key?.id ?? null;
      }
    }

    if (channel === "email") {
      if (!email) return { error: "Email não cadastrado" };
      await resend.emails.send({
        from: "PlaceGo CRM <noreply@placego.com.br>",
        to: email,
        subject: `Re: Contato de ${name}`,
        text: content,
      });
    }

    await db.insert(contactMessages).values({
      contactId,
      sdrId: user.id,
      channel: channel as any,
      direction: "out",
      content,
      whatsappMessageId,
      ack: whatsappMessageId ? 0 : null,
    });

    revalidatePath(`/sdr/contacts/${contactId}`);
    return { ok: true };

  } catch (err: any) {
    console.error("[sendContactMessage]", err);
    return { error: err.message ?? "Erro ao enviar mensagem" };
  }
}

interface SendMediaParams {
  contactId: string;
  phone: string | null;
  instanceName: string | null;
  tenantId?: string | null;
  mediaType: string;
  base64: string;
  mimeType: string;
  caption: string;
  fileName: string;
}

export async function sendContactMedia(params: SendMediaParams) {
  const user = await requireRole(["sdr", "admin_placego", "corretor", "corretor_tenant"]);
  const { contactId, phone, instanceName, tenantId, mediaType, base64, mimeType, caption, fileName } = params;

  if (!phone) return { error: "Telefone não cadastrado" };

  try {
    // Salvar no storage para exibir na timeline
    const mediaUrl = await uploadBase64ToStorage(base64, mimeType, `sent/${contactId}`);

    // Detectar provider
    const wabaConfig = tenantId ? await getTenantWabaConfig(tenantId) : null;

    let whatsappMessageId: string | null = null;
    if (wabaConfig?.provider === "meta_cloud") {
      if (!wabaConfig.phoneNumberId || !wabaConfig.accessToken) {
        return { error: "Credenciais Meta Cloud não configuradas para esta empresa" };
      }
      const metaMediaType = mediaType === "audio" ? "audio" : mediaType as "image" | "video" | "document" | "audio";
      const result = await metaSendMedia(
        { phoneNumberId: wabaConfig.phoneNumberId, accessToken: wabaConfig.accessToken },
        phone,
        metaMediaType,
        mediaUrl,
        caption || undefined,
        mediaType === "document" ? fileName : undefined
      );
      whatsappMessageId = result?.messages?.[0]?.id ?? null;
    } else {
      if (!instanceName) return { error: "WhatsApp não configurado para esta empresa" };
      let waResult: any;
      if (mediaType === "audio") {
        waResult = await sendAudio(instanceName, phone, base64);
      } else {
        waResult = await sendMedia(instanceName, phone, mediaType as any, base64, caption, fileName);
      }
      whatsappMessageId = waResult?.key?.id ?? null;
    }

    await db.insert(contactMessages).values({
      contactId,
      sdrId: user.id,
      channel: "whatsapp",
      direction: "out",
      content: caption || `[${mediaType}]`,
      mediaUrl,
      mediaType,
      whatsappMessageId,
      ack: whatsappMessageId ? 0 : null,
    });

    revalidatePath(`/sdr/contacts/${contactId}`);
    return { ok: true };

  } catch (err: any) {
    console.error("[sendContactMedia]", err);
    return { error: err.message ?? "Erro ao enviar mídia" };
  }
}
