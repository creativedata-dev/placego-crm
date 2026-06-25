"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads, leadAssignments, users, tenants } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sendLeadAssignedEmail } from "@/lib/email";
import { notifyBrokerNewLead } from "@/lib/evolution";

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

  // Cria um assignment por corretor
  await db.insert(leadAssignments).values(
    brokerIds.map((brokerId) => ({
      leadId,
      brokerId,
      assignedBySdrId: user.id,
      notes: notes ?? null,
    }))
  );

  // Busca dados dos corretores
  const brokers = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone, tenantId: users.tenantId })
    .from(users)
    .where(inArray(users.id, brokerIds));

  // Busca instância Evolution do tenant (se o contato tem tenant)
  let evolutionInstance: string | null = null;
  if (contact?.tenantId) {
    const [tenant] = await db.select({ slug: tenants.slug }).from(tenants).where(eq(tenants.id, contact.tenantId)).limit(1);
    if (tenant) evolutionInstance = `placego-${tenant.slug}`;
  }

  // Envia email + WhatsApp para cada corretor (sem bloquear redirect)
  await Promise.allSettled([
    ...brokers.map((broker) =>
      sendLeadAssignedEmail({ brokerName: broker.name, brokerEmail: broker.email })
    ),
    ...brokers
      .filter((b) => b.phone && evolutionInstance)
      .map((broker) =>
        notifyBrokerNewLead(
          evolutionInstance!,
          broker.phone!,
          broker.name,
          contact?.name ?? "Novo lead",
          leadId
        )
      ),
  ]);

  revalidatePath("/sdr/queue");
  revalidatePath(`/sdr/routing/${leadId}`);
  redirect("/sdr/queue");
}
