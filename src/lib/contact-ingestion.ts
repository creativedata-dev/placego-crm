import { db } from "@/db";
import { leads, contactMessages, sdrAssignments } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { assignContactToNextSdr } from "@/lib/round-robin";

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

  // Buscar contato existente por telefone, email ou meta_user_id
  let existing = null;
  if (phone) {
    [existing] = await db.select({ id: leads.id }).from(leads)
      .where(and(eq(leads.phone, phone), gte(leads.createdAt, thirtyDaysAgo))).limit(1);
  }
  if (!existing && email) {
    [existing] = await db.select({ id: leads.id }).from(leads)
      .where(and(eq(leads.email, email), gte(leads.createdAt, thirtyDaysAgo))).limit(1);
  }
  if (!existing && metaUserId) {
    [existing] = await db.select({ id: leads.id }).from(leads)
      .where(and(eq(leads.metaUserId, metaUserId), gte(leads.createdAt, thirtyDaysAgo))).limit(1);
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
    // Atualizar last_interaction_at para mover o card ao topo da coluna
    await db
      .update(sdrAssignments)
      .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
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

  await assignContactToNextSdr(contact.id);
  // Marcar last_interaction_at no assignment recém criado
  await db
    .update(sdrAssignments)
    .set({ lastInteractionAt: new Date() })
    .where(eq(sdrAssignments.contactId, contact.id));

  return { contactId: contact.id, isNew: true };
}
