"use server";

import { db } from "@/db";
import { messageAutomations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type AutomationTrigger = "contact_created" | "lead_distributed" | "reopen_conversation" | "sla_breach";

export interface AutomationPayload {
  name: string;
  trigger: AutomationTrigger;
  templateName?: string;
  templateParams?: Record<string, string>;
  messageText?: string;
  delayMinutes?: number;
  conditions?: Record<string, unknown>;
}

export async function listAutomations(tenantId: string) {
  await requireRole(["admin_placego", "admin_tenant"]);
  return db.select().from(messageAutomations).where(eq(messageAutomations.tenantId, tenantId));
}

export async function createAutomation(tenantId: string, payload: AutomationPayload) {
  const user = await requireRole(["admin_placego", "admin_tenant"]);
  if (user.role === "admin_tenant" && user.tenantId !== tenantId) {
    return { ok: false, message: "Sem permissão." };
  }
  await db.insert(messageAutomations).values({
    tenantId,
    name: payload.name,
    trigger: payload.trigger,
    templateName: payload.templateName ?? null,
    templateParams: payload.templateParams ?? null,
    messageText: payload.messageText ?? null,
    delayMinutes: payload.delayMinutes ?? 0,
    conditions: payload.conditions ?? null,
    active: "true",
  });
  revalidatePath(`/tenants/${tenantId}/automations`);
  return { ok: true, message: "Automação criada." };
}

export async function updateAutomation(id: string, tenantId: string, payload: Partial<AutomationPayload>) {
  const user = await requireRole(["admin_placego", "admin_tenant"]);
  if (user.role === "admin_tenant" && user.tenantId !== tenantId) {
    return { ok: false, message: "Sem permissão." };
  }
  await db.update(messageAutomations)
    .set({
      ...payload,
      templateParams: payload.templateParams ?? undefined,
      conditions: payload.conditions ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(messageAutomations.id, id), eq(messageAutomations.tenantId, tenantId)));
  revalidatePath(`/tenants/${tenantId}/automations`);
  return { ok: true, message: "Automação atualizada." };
}

export async function toggleAutomation(id: string, tenantId: string, active: boolean) {
  await requireRole(["admin_placego", "admin_tenant"]);
  await db.update(messageAutomations)
    .set({ active: active ? "true" : "false", updatedAt: new Date() })
    .where(and(eq(messageAutomations.id, id), eq(messageAutomations.tenantId, tenantId)));
  revalidatePath(`/tenants/${tenantId}/automations`);
}

export async function deleteAutomation(id: string, tenantId: string) {
  await requireRole(["admin_placego", "admin_tenant"]);
  await db.delete(messageAutomations)
    .where(and(eq(messageAutomations.id, id), eq(messageAutomations.tenantId, tenantId)));
  revalidatePath(`/tenants/${tenantId}/automations`);
  return { ok: true };
}
