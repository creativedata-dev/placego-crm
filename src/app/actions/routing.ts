"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads, leadAssignments, users, tenants, sdrAssignments } from "@/db/schema";
import { eq, inArray, and, notInArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sendLeadAssignedEmail } from "@/lib/email";
import { wpNotifyBrokerNewLead } from "@/lib/whatsapp";

export async function assignLeadToBrokers(
  leadId: string,
  brokerIds: string[],
  notes?: string
) {
  const user = await requireRole(["sdr", "admin_placego"]);

  if (brokerIds.length === 0) throw new Error("Selecione ao menos um corretor.");

  // Busca o lead para pegar o tenant
  const [contact] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);

  // Atualiza stage para lead
  await db
    .update(leads)
    .set({
      stage: "lead",
      status: "qualified",
      sdrId: user.id,
      qualifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));

  // Cancela assignments anteriores que não estão na nova lista
  await db
    .update(leadAssignments)
    .set({ status: "lost", updatedAt: new Date() })
    .where(and(eq(leadAssignments.leadId, leadId), notInArray(leadAssignments.brokerId, brokerIds)));

  // Cria assignments apenas para corretores que ainda não têm um ativo
  const existing = await db
    .select({ brokerId: leadAssignments.brokerId })
    .from(leadAssignments)
    .where(and(eq(leadAssignments.leadId, leadId), inArray(leadAssignments.brokerId, brokerIds)));
  const existingIds = new Set(existing.map((e) => e.brokerId));
  const newBrokerIds = brokerIds.filter((id) => !existingIds.has(id));
  if (newBrokerIds.length > 0) {
    await db.insert(leadAssignments).values(
      newBrokerIds.map((brokerId) => ({
        leadId,
        brokerId,
        assignedBySdrId: user.id,
        notes: notes ?? null,
      }))
    );
  }

  // Move o sdr_assignment para "distribuido"
  await db
    .update(sdrAssignments)
    .set({ status: "distribuido", updatedAt: new Date() })
    .where(eq(sdrAssignments.contactId, leadId));

  // Busca dados dos corretores
  const brokers = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, tenantId: users.tenantId })
    .from(users)
    .where(inArray(users.id, brokerIds));

  // Busca configuração WhatsApp do tenant
  let wpConfig: import("@/lib/whatsapp").TenantWhatsAppConfig = { provider: "evolution" };
  if (contact?.tenantId) {
    const [tenant] = await db
      .select({ slug: tenants.slug, whatsappProvider: tenants.whatsappProvider, metaPhoneNumberId: tenants.metaPhoneNumberId, metaAccessToken: tenants.metaAccessToken })
      .from(tenants)
      .where(eq(tenants.id, contact.tenantId))
      .limit(1);
    if (tenant) {
      wpConfig = {
        provider: (tenant.whatsappProvider ?? "evolution") as "evolution" | "meta_cloud",
        evolutionInstance: `placego-${tenant.slug}`,
        metaPhoneNumberId: tenant.metaPhoneNumberId,
        metaAccessToken: tenant.metaAccessToken,
      };
    }
  }

  // Envia email + WhatsApp para cada corretor com dados do contato
  await Promise.allSettled([
    ...brokers.map((broker) =>
      sendLeadAssignedEmail({
        brokerName: broker.name,
        brokerEmail: broker.email,
        contactName: contact?.name ?? "Novo lead",
        contactPhone: contact?.phone,
        contactEmail: contact?.email,
        notes: notes ?? null,
      })
    ),
    ...brokers
      .filter((b) => b.phone)
      .map((broker) =>
        wpNotifyBrokerNewLead(
          wpConfig,
          broker.phone!,
          broker.name,
          contact?.name ?? "Novo lead",
          leadId,
          contact?.phone,
          contact?.email,
          notes ?? null
        )
      ),
  ]);

  revalidatePath("/sdr/queue");
  revalidatePath(`/sdr/routing/${leadId}`);
  redirect("/sdr/queue");
}
