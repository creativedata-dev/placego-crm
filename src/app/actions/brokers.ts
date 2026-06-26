"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, brokerPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function createBroker(formData: FormData) {
  await requireRole(["admin_placego", "admin_tenant"]);

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const tenantId = formData.get("tenantId") as string || null;
  const role = (formData.get("role") as string) || "corretor";
  const phone = formData.get("phone") as string;
  const creci = formData.get("creci") as string;

  // Criar usuário no Supabase Auth (requer service role key)
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
  });

  if (error || !authData.user) throw new Error(error?.message ?? "Erro ao criar usuário");

  // Inserir na tabela users
  await db.insert(users).values({
    id: authData.user.id,
    email,
    name,
    role: role as any,
    tenantId: tenantId || null,
    phone,
  });

  // Inserir preferências do corretor
  if (creci) {
    await db.insert(brokerPreferences).values({
      brokerId: authData.user.id,
      creci,
    });
  }

  revalidatePath("/brokers");
  redirect("/brokers");
}

export async function updateBrokerPreferences(brokerId: string, formData: FormData) {
  await requireRole(["admin_placego", "admin_tenant", "corretor", "corretor_tenant"]);

  // Atualizar dados pessoais
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  await db.update(users).set({
    ...(name && { name }),
    ...(email && { email }),
    phone: phone || null,
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
