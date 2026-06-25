"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";

export async function createTenant(formData: FormData) {
  await requireRole(["admin_placego"]);

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const slug = formData.get("slug") as string;

  await db.insert(tenants).values({ name, type: type as any, slug });
  revalidatePath("/tenants");
  redirect("/tenants");
}

export async function updateTenant(id: string, formData: FormData) {
  await requireRole(["admin_placego"]);

  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const slug = formData.get("slug") as string;

  await db.update(tenants).set({ name, type: type as any, slug, updatedAt: new Date() }).where(eq(tenants.id, id));
  revalidatePath("/tenants");
  redirect("/tenants");
}

export async function deleteTenant(id: string) {
  await requireRole(["admin_placego"]);
  await db.delete(tenants).where(eq(tenants.id, id));
  revalidatePath("/tenants");
}

export async function generateWebhookToken(tenantId: string) {
  await requireRole(["admin_placego"]);
  const token = randomBytes(24).toString("hex"); // 48 chars hex
  await db.update(tenants).set({ webhookToken: token, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  revalidatePath(`/tenants/${tenantId}/webhook`);
  return token;
}

export async function revokeWebhookToken(tenantId: string) {
  await requireRole(["admin_placego"]);
  await db.update(tenants).set({ webhookToken: null, updatedAt: new Date() }).where(eq(tenants.id, tenantId));
  revalidatePath(`/tenants/${tenantId}/webhook`);
}
