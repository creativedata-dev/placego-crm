"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads, sdrAssignments, contactMessages } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { assignContactToNextSdr } from "@/lib/round-robin";

export async function createContact(formData: FormData) {
  await requireRole(["admin_placego"]);

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const email = (formData.get("email") as string) || null;
  const origin = (formData.get("origin") as string) || "manual";
  const notes = (formData.get("notes") as string) || null;
  const tenantId = (formData.get("tenantId") as string) || null;

  // Score básico para contatos manuais
  let score = 0;
  if (name) score += 20;
  if (phone) score += 30;
  if (email) score += 20;
  score += 15; // manual sempre tem origem identificada

  const [contact] = await db.insert(leads).values({
    name,
    phone,
    email,
    origin: origin as any,
    stage: "contato",
    status: "new",
    qualityScore: score,
    notes,
    tenantId,
  }).returning();

  // Round-robin: atribuir ao próximo SDR
  await assignContactToNextSdr(contact.id);

  revalidatePath("/sdr/queue");
}

export async function markMessagesAsRead(contactId: string) {
  await requireRole(["sdr", "admin_placego"]);
  await db
    .update(contactMessages)
    .set({ readAt: new Date() })
    .where(and(eq(contactMessages.contactId, contactId), eq(contactMessages.direction, "in"), isNull(contactMessages.readAt)));
  revalidatePath("/sdr/queue");
}

export async function updateSdrAssignmentStatus(
  assignmentId: string,
  status: "novo" | "em_contato" | "aguardando" | "qualificado" | "distribuido" | "invalido",
  notes?: string
) {
  await requireRole(["sdr", "admin_placego"]);

  const updateData: any = {
    status,
    updatedAt: new Date(),
  };

  if (notes !== undefined) updateData.notes = notes;
  if (status === "qualificado") {
    updateData.qualifiedAt = new Date();
    // Atualizar stage do contato para lead
    const [assignment] = await db
      .select({ contactId: sdrAssignments.contactId })
      .from(sdrAssignments)
      .where(eq(sdrAssignments.id, assignmentId))
      .limit(1);

    if (assignment) {
      await db
        .update(leads)
        .set({ stage: "lead", qualifiedAt: new Date(), updatedAt: new Date() })
        .where(eq(leads.id, assignment.contactId));
    }
  }

  await db
    .update(sdrAssignments)
    .set(updateData)
    .where(eq(sdrAssignments.id, assignmentId));

  revalidatePath("/sdr/queue");
}
