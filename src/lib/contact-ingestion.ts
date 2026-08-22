import { db } from "@/db";
import { leads, contactMessages, sdrAssignments, tenants, contactOptins } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { assignContactToNextSdr } from "@/lib/round-robin";
import { notifySdrNewContact } from "@/lib/push";
import { sendText } from "@/lib/meta-waba";
import { fireAutomation } from "@/lib/automation-engine";

const DEFAULT_WELCOME_MESSAGE =
  "Olá! 👋 Recebemos sua mensagem e em breve um de nossos especialistas vai entrar em contato com você.";

interface IngestParams {
  name: string;
  phone?: string | null;
  email?: string | null;
  metaUserId?: string | null;
  origin: "whatsapp" | "meta_dm_instagram" | "meta_dm_facebook" | "meta_comment" | "email";
  channel: "whatsapp" | "instagram_dm" | "facebook_dm" | "comment" | "email";
  tenantId: string | null;
  qualityScore: number;
  messageContent: string;
  mediaUrl?: string;
  mediaType?: string;
}

/**
 * Cria ou atualiza um contato a partir de uma mensagem recebida em qualquer canal.
 * Sempre registra a mensagem em contact_messages (timeline).
 * Deduplica por telefone, email ou meta_user_id nos últimos 30 dias.
 */
export async function ingestContactMessage(params: IngestParams) {
  const { name, phone, email, metaUserId, origin, channel, tenantId, qualityScore, messageContent, mediaUrl, mediaType } = params;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Deduplicação por telefone/email/metaUserId DENTRO do mesmo tenant.
  // Mensagens para tenants diferentes geram contatos independentes.
  const tenantCondition = tenantId ? eq(leads.tenantId, tenantId) : sql`${leads.tenantId} IS NULL`;

  let existing = null;
  if (phone) {
    [existing] = await db.select({ id: leads.id }).from(leads)
      .where(and(eq(leads.phone, phone), tenantCondition, gte(leads.createdAt, thirtyDaysAgo))).limit(1);
  }
  if (!existing && email) {
    [existing] = await db.select({ id: leads.id }).from(leads)
      .where(and(eq(leads.email, email), tenantCondition, gte(leads.createdAt, thirtyDaysAgo))).limit(1);
  }
  if (!existing && metaUserId) {
    [existing] = await db.select({ id: leads.id }).from(leads)
      .where(and(eq(leads.metaUserId, metaUserId), tenantCondition, gte(leads.createdAt, thirtyDaysAgo))).limit(1);
  }

  if (existing) {
    await db.insert(contactMessages).values({
      contactId: existing.id,
      channel: channel as any,
      direction: "in",
      content: messageContent,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
    });
    // Se arquivado, reativar para "novo" e mover ao topo
    // Caso contrário só atualiza last_interaction_at
    await db
      .update(sdrAssignments)
      .set({
        status: sql`CASE WHEN status = 'arquivado' THEN 'novo'::sdr_assignment_status ELSE status END`,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sdrAssignments.contactId, existing.id));
    return { contactId: existing.id, isNew: false };
  }

  const [contact] = await db.insert(leads).values({
    name,
    phone: phone ?? null,
    email: email ?? null,
    metaUserId: metaUserId ?? null,
    origin: origin as any,
    stage: "contato",
    status: "new",
    tenantId,
    qualityScore,
  }).returning();

  await db.insert(contactMessages).values({
    contactId: contact.id,
    channel: channel as any,
    direction: "in",
    content: messageContent,
    mediaUrl: mediaUrl ?? null,
    mediaType: mediaType ?? null,
  });

  const assignedSdrId = await assignContactToNextSdr(contact.id, tenantId);
  // Marcar last_interaction_at no assignment recém criado
  await db
    .update(sdrAssignments)
    .set({ lastInteractionAt: new Date() })
    .where(eq(sdrAssignments.contactId, contact.id));

  // Push notification para o SDR atribuído
  if (assignedSdrId) {
    notifySdrNewContact(assignedSdrId, name, origin).catch(() => {});
  }

  // Boas-vindas via texto livre (janela está aberta pois o contato acabou de escrever)
  // Registra opt-in: contato iniciou conversa voluntariamente
  if (phone && tenantId && channel === "whatsapp") {
    db.select({
      phoneNumberId: tenants.metaPhoneNumberId,
      accessToken: tenants.metaAccessToken,
      provider: tenants.whatsappProvider,
      autoWelcome: tenants.metaAutoWelcome,
      welcomeMessage: tenants.metaWelcomeMessage,
    })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
      .then(async ([tenant]) => {
        if (!tenant) return;

        // Registrar opt-in — contato iniciou voluntariamente
        await db
          .insert(contactOptins)
          .values({
            tenantId,
            phone: phone.replace(/\D/g, ""),
            channel: "whatsapp",
            consentText: "Contato iniciado pelo usuário via WhatsApp",
          })
          .onConflictDoNothing()
          .catch(() => {});

        // Enviar mensagem de boas-vindas (texto livre — janela acaba de abrir)
        if (tenant.provider === "meta_cloud" && tenant.autoWelcome && tenant.phoneNumberId && tenant.accessToken) {
          const msg = tenant.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
          sendText(tenant.phoneNumberId, tenant.accessToken, phone, msg).then(async (res) => {
            // Salva na timeline como mensagem de saída
            const msgId = (res as any)?.messages?.[0]?.id ?? null;
            await db.insert(contactMessages).values({
              contactId: contact.id,
              channel: "whatsapp",
              direction: "out",
              content: msg,
              whatsappMessageId: msgId,
              ack: msgId ? 0 : null,
            }).catch(() => {});
          }).catch((err) => console.error("[ingest] erro ao enviar boas-vindas:", err));
        }
      })
      .catch(() => {});
  }

  // Disparar automações do trigger contact_created
  if (tenantId) {
    fireAutomation("contact_created", {
      tenantId,
      contact: { name, phone, email },
    }).catch(() => {});
  }

  return { contactId: contact.id, isNew: true };
}
