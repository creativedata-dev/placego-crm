"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads, leadAssignments, users, gestorDistributions, sdrAssignments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { sendLeadAssignedEmail } from "@/lib/email";
import { notifyBrokerNewLead as pushNotifyBroker } from "@/lib/push";

/** Lista os leads recebidos pelo gestor (lead_assignments onde brokerId = gestor) */
export async function getGestorLeads(gestorId: string) {
  return db
    .select({
      assignment: leadAssignments,
      lead: leads,
    })
    .from(leadAssignments)
    .innerJoin(leads, eq(leadAssignments.leadId, leads.id))
    .where(
      and(
        eq(leadAssignments.brokerId, gestorId),
        eq(leadAssignments.archived, false),
      )
    )
    .orderBy(desc(leadAssignments.assignedAt));
}

/** Lista corretores do mesmo tenant do gestor */
export async function getGestorBrokers(gestorId: string) {
  const [gestor] = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, gestorId))
    .limit(1);

  if (!gestor?.tenantId) return [];

  return db
    .select({ id: users.id, name: users.name, phone: users.phone })
    .from(users)
    .where(
      and(
        eq(users.tenantId, gestor.tenantId),
        eq(users.isActive, true),
      )
    )
    .orderBy(users.name);
}

/** Gestor distribui um lead para um corretor do seu tenant */
export async function distributeLeadToBroker(
  leadAssignmentId: string,
  brokerId: string,
  notes?: string,
) {
  const user = await requireRole(["gestor_imobiliaria", "admin_placego"]);

  const [assignment] = await db
    .select({ id: leadAssignments.id, leadId: leadAssignments.leadId, gestorId: leadAssignments.brokerId })
    .from(leadAssignments)
    .where(eq(leadAssignments.id, leadAssignmentId))
    .limit(1);

  if (!assignment) throw new Error("Assignment não encontrado");

  const [lead] = await db.select().from(leads).where(eq(leads.id, assignment.leadId)).limit(1);
  const [broker] = await db.select().from(users).where(eq(users.id, brokerId)).limit(1);

  // Cria lead_assignment para o corretor
  const [newAssignment] = await db
    .insert(leadAssignments)
    .values({
      leadId: assignment.leadId,
      brokerId,
      assignedBySdrId: user.id,
      status: "new",
      notes: notes ?? null,
    })
    .returning();

  // Registra a distribuição do gestor
  await db.insert(gestorDistributions).values({
    leadAssignmentId: newAssignment.id,
    gestorId: assignment.gestorId,
    brokerId,
    notes: notes ?? null,
  });

  // Move gestor para "contacted" para indicar que distribuiu
  await db
    .update(leadAssignments)
    .set({ status: "contacted" })
    .where(eq(leadAssignments.id, leadAssignmentId));

  // Notifica o corretor
  if (broker && lead) {
    const contactName = lead.name ?? "Lead";
    const opts = {
      phone: lead.phone ?? undefined,
      email: lead.email ?? undefined,
      assignmentId: newAssignment.id,
      notes: notes,
    };

    await Promise.allSettled([
      sendLeadAssignedEmail({
        brokerName: broker.name ?? "",
        brokerEmail: broker.email,
        contactName,
        contactPhone: lead.phone,
        contactEmail: lead.email,
        notes: notes ?? null,
      }),
      Promise.resolve(), // WA notify via push já cobre — integração completa em próxima iteração
      pushNotifyBroker(brokerId, contactName, opts),
    ]);
  }

  revalidatePath("/gestor");
  revalidatePath("/pipeline");
  return { ok: true };
}
