"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, brokerPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function createBroker(formData: FormData) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  // admin_tenant sempre usa seu próprio tenant, não aceita do form
  const tenantId = currentUser.role === "admin_tenant"
    ? currentUser.tenantId
    : (formData.get("tenantId") as string) || null;
  const role = (formData.get("role") as string) || "corretor";
  const phone = (formData.get("phone") as string) || null;
  const creci = (formData.get("creci") as string) || null;
  const isActive = formData.get("isActive") !== "false";
  const cities = ((formData.get("cities") as string) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const neighborhoods = ((formData.get("neighborhoods") as string) ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const propertyTypes = formData.getAll("propertyTypes") as string[];
  const minPrice = (formData.get("minPrice") as string) || null;
  const maxPrice = (formData.get("maxPrice") as string) || null;

  // Criar usuário no Supabase Auth (requer service role key)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  let userId: string;
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already been registered") || error.message.includes("already exists")) {
      // Usuário já existe — busca o ID
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing) throw new Error("Usuário já existe mas não foi encontrado");
      userId = existing.id;
    } else {
      throw new Error(error.message);
    }
  } else {
    if (!authData.user) throw new Error("Erro ao criar usuário");
    userId = authData.user.id;
  }

  // Inserir na tabela users (ou atualizar se já existir)
  await db.insert(users).values({
    id: userId,
    email,
    name,
    role: role as any,
    tenantId: tenantId || null,
    phone,
    isActive,
  }).onConflictDoUpdate({
    target: users.id,
    set: { name, role: role as any, tenantId: tenantId || null, phone, isActive, updatedAt: new Date() },
  });

  // Inserir/atualizar preferências do corretor
  await db.insert(brokerPreferences).values({
    brokerId: userId,
    creci: creci ?? null,
    cities,
    neighborhoods,
    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,
    propertyTypes,
  }).onConflictDoUpdate({
    target: brokerPreferences.brokerId,
    set: { creci: creci ?? null, cities, neighborhoods, minPrice: minPrice ?? undefined, maxPrice: maxPrice ?? undefined, propertyTypes },
  });

  revalidatePath("/brokers");
  redirect("/brokers");
}

export async function updateBrokerPreferences(brokerId: string, formData: FormData) {
  const currentUser = await requireRole(["admin_placego", "admin_tenant", "corretor", "corretor_tenant"]);

  // admin_tenant só pode editar corretores do seu tenant
  if (currentUser.role === "admin_tenant") {
    const [broker] = await db.select({ tenantId: users.tenantId }).from(users).where(eq(users.id, brokerId)).limit(1);
    if (!broker || broker.tenantId !== currentUser.tenantId) throw new Error("Sem permissão");
  }

  // Atualizar dados pessoais
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const isActive = formData.get("isActive") !== "false";
  // admin_tenant não pode alterar o tenant do corretor
  const tenantId = currentUser.role === "admin_tenant"
    ? currentUser.tenantId
    : (formData.get("tenantId") as string) || null;
  await db.update(users).set({
    ...(name && { name }),
    ...(email && { email }),
    phone: phone || null,
    isActive,
    tenantId,
    updatedAt: new Date(),
  }).where(eq(users.id, brokerId));

  const cities = ((formData.get("cities") as string) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const neighborhoods = ((formData.get("neighborhoods") as string) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const propertyTypes = formData.getAll("propertyTypes") as string[];

  await db
    .insert(brokerPreferences)
    .values({
      brokerId,
      cities,
      neighborhoods,
      minPrice: formData.get("minPrice") as string,
      maxPrice: formData.get("maxPrice") as string,
      propertyTypes,
      creci: formData.get("creci") as string,
    })
    .onConflictDoUpdate({
      target: brokerPreferences.brokerId,
      set: {
        cities,
        neighborhoods,
        minPrice: formData.get("minPrice") as string,
        maxPrice: formData.get("maxPrice") as string,
        propertyTypes,
        creci: formData.get("creci") as string,
      },
    });

  revalidatePath("/brokers");
}
