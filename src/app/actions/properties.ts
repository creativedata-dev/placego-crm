"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { properties, developments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function createProperty(formData: FormData) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  // admin_tenant sempre usa seu próprio tenant
  const tenantId = currentUser.role === "admin_tenant"
    ? currentUser.tenantId!
    : formData.get("tenantId") as string;

  await db.insert(properties).values({
    tenantId,
    type: formData.get("type") as any,
    address: formData.get("address") as string,
    neighborhood: formData.get("neighborhood") as string,
    city: formData.get("city") as string,
    state: (formData.get("state") as string) || "SP",
    price: formData.get("price") as string,
    areaM2: formData.get("areaM2") as string,
    bedrooms: Number(formData.get("bedrooms")) || null,
    suites: Number(formData.get("suites")) || null,
    parkingSpots: Number(formData.get("parkingSpots")) || null,
  });

  revalidatePath("/properties");
  redirect("/properties");
}

export async function updateProperty(id: string, formData: FormData) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  // admin_tenant só pode editar imóveis do seu tenant
  if (currentUser.role === "admin_tenant") {
    const [prop] = await db.select({ tenantId: properties.tenantId }).from(properties).where(eq(properties.id, id)).limit(1);
    if (!prop || prop.tenantId !== currentUser.tenantId) throw new Error("Sem permissão");
  }

  await db.update(properties).set({
    type: formData.get("type") as any,
    address: formData.get("address") as string,
    neighborhood: formData.get("neighborhood") as string,
    city: formData.get("city") as string,
    state: (formData.get("state") as string) || "SP",
    price: formData.get("price") as string,
    areaM2: formData.get("areaM2") as string,
    bedrooms: Number(formData.get("bedrooms")) || null,
    suites: Number(formData.get("suites")) || null,
    parkingSpots: Number(formData.get("parkingSpots")) || null,
    status: formData.get("status") as any,
    updatedAt: new Date(),
  }).where(eq(properties.id, id));

  revalidatePath("/properties");
  redirect("/properties");
}

export async function deleteProperty(id: string) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  if (currentUser.role === "admin_tenant") {
    const [prop] = await db.select({ tenantId: properties.tenantId }).from(properties).where(eq(properties.id, id)).limit(1);
    if (!prop || prop.tenantId !== currentUser.tenantId) throw new Error("Sem permissão");
  }

  await db.delete(properties).where(eq(properties.id, id));
  revalidatePath("/properties");
}

export async function createDevelopment(formData: FormData) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  const tenantId = currentUser.role === "admin_tenant"
    ? currentUser.tenantId!
    : formData.get("tenantId") as string;

  await db.insert(developments).values({
    tenantId,
    name: formData.get("name") as string,
    address: formData.get("address") as string,
    neighborhood: formData.get("neighborhood") as string,
    city: formData.get("city") as string,
    state: (formData.get("state") as string) || "SP",
    minPrice: formData.get("minPrice") as string,
    maxPrice: formData.get("maxPrice") as string,
  });

  revalidatePath("/properties");
  redirect("/properties");
}
