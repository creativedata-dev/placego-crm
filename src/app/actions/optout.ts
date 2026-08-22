"use server";

import { db } from "@/db";
import { contactOptouts, tenants } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function listOptouts(tenantId: string) {
  await requireRole(["admin_placego", "admin_tenant"]);
  return db
    .select()
    .from(contactOptouts)
    .where(eq(contactOptouts.tenantId, tenantId))
    .orderBy(contactOptouts.createdAt);
}

export async function addOptout(tenantId: string, phone: string, reason?: string) {
  await requireRole(["admin_placego", "admin_tenant"]);
  const normalized = phone.replace(/\D/g, "");
  await db
    .insert(contactOptouts)
    .values({ tenantId, phone: normalized, reason: reason ?? null, source: "manual" })
    .onConflictDoNothing();
  revalidatePath(`/tenants/${tenantId}/automations`);
}

export async function removeOptout(id: string, tenantId: string) {
  await requireRole(["admin_placego", "admin_tenant"]);
  await db
    .delete(contactOptouts)
    .where(and(eq(contactOptouts.id, id), eq(contactOptouts.tenantId, tenantId)));
  revalidatePath(`/tenants/${tenantId}/automations`);
}

export async function saveWelcomeConfig(
  tenantId: string,
  opts: { autoWelcome: boolean; welcomeMessage: string }
) {
  await requireRole(["admin_placego", "admin_tenant"]);
  await db
    .update(tenants)
    .set({
      metaAutoWelcome: opts.autoWelcome,
      metaWelcomeMessage: opts.welcomeMessage.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  revalidatePath(`/tenants/${tenantId}/automations`);
  return { ok: true };
}

export async function saveOptoutKeywords(tenantId: string, keywords: string[]) {
  await requireRole(["admin_placego", "admin_tenant"]);
  await db
    .update(tenants)
    .set({
      metaOptoutKeywords: keywords.length > 0 ? keywords : null,
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
  revalidatePath(`/tenants/${tenantId}/automations`);
  return { ok: true };
}
