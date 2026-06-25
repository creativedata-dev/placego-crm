"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads, leadAssignments, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sendLeadAssignedEmail } from "@/lib/email";

export async function assignLeadToBrokers(
  leadId: string,
  brokerIds: string[],
  notes?: string
) {
  const user = await requireRole(["sdr", "admin_placego"]);

  if (brokerIds.length === 0) throw new Error("Selecione ao menos um corretor.");

  // Qualifica o lead ao distribuir
  await db
    .update(leads)
    .set({
      status: "qualified",
      sdrId: user.id,
      qualifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));

  // Cria um assignment por corretor (lead espelhado)
  await db.insert(leadAssignments).values(
    brokerIds.map((brokerId) => ({
      leadId,
      brokerId,
      assignedBySdrId: user.id,
      notes: notes ?? null,
    }))
  );

  // Busca dados dos corretores e envia emails (sem bloquear o redirect em caso de falha)
  const brokers = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, brokerIds));

  await Promise.allSettled(
    brokers.map((broker) =>
      sendLeadAssignedEmail({
        brokerName: broker.name,
        brokerEmail: broker.email,
      })
    )
  );

  revalidatePath("/sdr/queue");
  revalidatePath(`/sdr/routing/${leadId}`);
  redirect("/sdr/queue");
}
