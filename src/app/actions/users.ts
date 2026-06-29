"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function createUser(formData: FormData) {
  await requireRole(["admin_placego"]);

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string;
  const tenantId = (formData.get("tenantId") as string) || null;
  const phone = (formData.get("phone") as string) || null;

  const supabase = adminClient();

  // Criar no Auth
  let userId: string;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-12) + "A1!",
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes("already")) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users?.find((u) => u.email === email);
      if (!existing) throw new Error("Usuário já existe mas não foi encontrado");
      userId = existing.id;
    } else {
      throw new Error(error.message);
    }
  } else {
    userId = data.user!.id;
  }

  // Inserir/atualizar na tabela users
  await db.insert(users).values({
    id: userId, email, name,
    role: role as any,
    tenantId,
    phone,
    isActive: true,
  }).onConflictDoUpdate({
    target: users.id,
    set: { name, role: role as any, tenantId, phone, isActive: true, updatedAt: new Date() },
  });

  // Enviar convite por email
  await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  revalidatePath("/users");
  redirect("/users");
}

export async function updateUser(id: string, formData: FormData) {
  await requireRole(["admin_placego"]);

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const tenantId = (formData.get("tenantId") as string) || null;
  const phone = (formData.get("phone") as string) || null;

  await db.update(users).set({
    name, email,
    role: role as any,
    tenantId,
    phone,
    updatedAt: new Date(),
  }).where(eq(users.id, id));

  revalidatePath("/users");
  redirect("/users");
}

export async function toggleUserActive(id: string, isActive: boolean) {
  await requireRole(["admin_placego"]);
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
  revalidatePath("/users");
}

export async function sendPasswordReset(id: string) {
  await requireRole(["admin_placego"]);

  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) throw new Error("Usuário não encontrado");

  const supabase = adminClient();
  await supabase.auth.admin.generateLink({ type: "recovery", email: user.email });

  // Envia email de reset via Resend
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "PlaceGo CRM <noreply@placego.com.br>",
    to: user.email,
    subject: "Redefinição de senha — PlaceGo CRM",
    html: `
      <p>Olá!</p>
      <p>Um administrador solicitou a redefinição da sua senha no PlaceGo CRM.</p>
      <p>Acesse o sistema e use a opção "Esqueci minha senha" com o email <strong>${user.email}</strong>.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Acessar PlaceGo CRM</a></p>
    `,
  });
}

export async function deleteUser(id: string) {
  await requireRole(["admin_placego"]);
  const supabase = adminClient();
  await supabase.auth.admin.deleteUser(id);
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/users");
}
