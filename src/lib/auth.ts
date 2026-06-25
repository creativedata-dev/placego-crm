import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export type UserRole =
  | "admin_placego"
  | "sdr"
  | "corretor"
  | "admin_tenant"
  | "corretor_tenant";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  return user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role as UserRole)) {
    redirect("/unauthorized");
  }
  return user;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin_placego: "Admin PlaceGo",
  sdr: "SDR",
  corretor: "Corretor",
  admin_tenant: "Admin Tenant",
  corretor_tenant: "Corretor Tenant",
};
