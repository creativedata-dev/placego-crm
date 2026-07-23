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
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const phone = (formData.get("phone") as string) || null;

  // admin_tenant só pode criar roles de tenant e sempre no seu próprio tenant
  let role: string;
  let tenantId: string | null;
  if (currentUser.role === "admin_tenant") {
    role = (formData.get("role") as string) || "corretor_tenant";
    if (!["admin_tenant", "corretor_tenant"].includes(role)) role = "corretor_tenant";
    tenantId = currentUser.tenantId ?? null;
  } else {
    role = formData.get("role") as string;
    tenantId = (formData.get("tenantId") as string) || null;
  }

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
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);

  // admin_tenant só pode editar usuários do seu tenant
  if (currentUser.role === "admin_tenant") {
    const [target] = await db.select({ tenantId: users.tenantId, role: users.role }).from(users).where(eq(users.id, id)).limit(1);
    if (!target || target.tenantId !== currentUser.tenantId) throw new Error("Sem permissão");
    if (!["admin_tenant", "corretor_tenant"].includes(target.role)) throw new Error("Sem permissão");
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = (formData.get("phone") as string) || null;

  let role: string;
  let tenantId: string | null;
  if (currentUser.role === "admin_tenant") {
    role = (formData.get("role") as string) || "corretor_tenant";
    if (!["admin_tenant", "corretor_tenant"].includes(role)) role = "corretor_tenant";
    tenantId = currentUser.tenantId ?? null;
  } else {
    role = formData.get("role") as string;
    tenantId = (formData.get("tenantId") as string) || null;
  }

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
  await requireRole(["admin_placego", "admin_tenant"]);
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
  revalidatePath("/users");
}

export async function sendPasswordReset(id: string): Promise<{ ok: boolean; error?: string; link?: string }> {
  await requireRole(["admin_placego", "admin_tenant"]);

  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return { ok: false, error: "Usuário não encontrado" };

  const supabase = adminClient();
  const { data, error: genError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: user.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery` },
  });

  if (genError || !data?.properties?.action_link) {
    console.error("[sendPasswordReset] generateLink error:", genError?.message);
    return { ok: false, error: genError?.message ?? "Erro ao gerar link" };
  }

  const resetLink = data.properties.action_link;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: emailError } = await resend.emails.send({
      from: "PlaceGo CRM <noreply@placego.com.br>",
      to: user.email,
      subject: "Redefinição de senha — PlaceGo CRM",
      html: `
        <p>Olá!</p>
        <p>Um administrador solicitou a redefinição da sua senha no PlaceGo CRM.</p>
        <p>Clique no botão abaixo para definir uma nova senha. O link é válido por 24 horas.</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Redefinir senha
          </a>
        </p>
        <p style="font-size:12px;color:#888;">Se você não solicitou essa redefinição, ignore este email.</p>
      `,
    });

    if (emailError) {
      console.error("[sendPasswordReset] Resend error:", emailError);
      // Email falhou mas link foi gerado — retorna o link para copiar manualmente
      return { ok: true, link: resetLink, error: `Email não enviado: ${emailError.message}. Copie o link abaixo.` };
    }
  } catch (e: any) {
    console.error("[sendPasswordReset] Resend exception:", e?.message);
    return { ok: true, link: resetLink, error: `Email não enviado: ${e?.message}. Copie o link abaixo.` };
  }

  return { ok: true };
}

export async function deleteUser(id: string) {
  await requireRole(["admin_placego"]);
  const supabase = adminClient();
  await supabase.auth.admin.deleteUser(id);
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/users");
}
