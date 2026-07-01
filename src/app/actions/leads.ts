"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leads, leadAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";

export async function qualifyLead(leadId: string) {
  const user = await requireRole(["sdr", "admin_placego"]);
  await db
    .update(leads)
    .set({
      status: "qualified",
      sdrId: user.id,
      qualifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  revalidatePath("/sdr/queue");
}

export async function invalidateLead(leadId: string, reason?: string) {
  const user = await requireRole(["sdr", "admin_placego"]);
  await db
    .update(leads)
    .set({
      status: "invalid",
      sdrId: user.id,
      notes: reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  revalidatePath("/sdr/queue");
}

export async function markDuplicate(leadId: string) {
  const user = await requireRole(["sdr", "admin_placego"]);
  await db
    .update(leads)
    .set({
      status: "duplicate",
      sdrId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  revalidatePath("/sdr/queue");
}

export async function putLeadOnWait(leadId: string) {
  const user = await requireRole(["sdr", "admin_placego"]);
  await db
    .update(leads)
    .set({
      status: "waiting",
      sdrId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  revalidatePath("/sdr/queue");
}

function calcScore(fields: { name?: string | null; phone?: string | null; email?: string | null; campaignId?: string | null; utmSource?: string | null; adName?: string | null }) {
  let s = 0;
  if (fields.name && fields.name !== "Sem nome") s += 20;
  if (fields.phone) s += 30;
  if (fields.email) s += 20;
  if (fields.campaignId) s += 15;
  if (fields.utmSource || fields.adName) s += 15;
  return s;
}

export async function updateContactData(
  contactId: string,
  data: { name?: string; phone?: string; email?: string; notes?: string }
) {
  await requireRole(["sdr", "admin_placego"]);

  const [current] = await db.select().from(leads).where(eq(leads.id, contactId)).limit(1);
  const merged = { ...current, ...data };
  const qualityScore = calcScore(merged);

  await db
    .update(leads)
    .set({ ...data, qualityScore, updatedAt: new Date() })
    .where(eq(leads.id, contactId));
  revalidatePath(`/sdr/contacts/${contactId}`);
}

export async function createManualLead(formData: FormData) {
  await requireRole(["sdr", "admin_placego"]);

  await db.insert(leads).values({
    name: formData.get("name") as string,
    phone: formData.get("phone") as string,
    email: (formData.get("email") as string) || null,
    origin: "manual",
    status: "new",
    qualityScore: 65,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/sdr/queue");
}
