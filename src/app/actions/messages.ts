"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { sendText } from "@/lib/evolution";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendMessageParams {
  contactId: string;
  channel: string;
  content: string;
  phone: string | null;
  email: string | null;
  name: string;
  instanceName: string | null;
}

export async function sendContactMessage(params: SendMessageParams) {
  const user = await requireRole(["sdr", "admin_placego"]);
  const { contactId, channel, content, phone, email, name, instanceName } = params;

  try {
    // Enviar pelo canal correspondente
    if (channel === "whatsapp") {
      if (!phone) return { error: "Telefone não cadastrado" };
      if (!instanceName) return { error: "WhatsApp não configurado para esta empresa" };
      await sendText(instanceName, phone, content);
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

    // Registrar na timeline
    await db.insert(contactMessages).values({
      contactId,
      sdrId: user.id,
      channel: channel as any,
      direction: "out",
      content,
    });

    revalidatePath(`/sdr/contacts/${contactId}`);
    return { ok: true };

  } catch (err: any) {
    console.error("[sendContactMessage]", err);
    return { error: err.message ?? "Erro ao enviar mensagem" };
  }
}
