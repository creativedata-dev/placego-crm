"use server";

import { db } from "@/db";
import { leads, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { sendWelcomeTemplate } from "@/lib/meta-waba";

export async function sendWelcomeTemplateAction(
  contactId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireRole(["sdr", "admin_placego"]);

    const [contact] = await db
      .select({ name: leads.name, phone: leads.phone, tenantId: leads.tenantId })
      .from(leads)
      .where(eq(leads.id, contactId))
      .limit(1);

    if (!contact) return { ok: false, error: "Contato não encontrado" };
    if (!contact.phone) return { ok: false, error: "Contato sem telefone" };
    if (!contact.tenantId) return { ok: false, error: "Contato sem empresa" };

    const [tenant] = await db
      .select({ phoneNumberId: tenants.metaPhoneNumberId, accessToken: tenants.metaAccessToken, provider: tenants.whatsappProvider })
      .from(tenants)
      .where(eq(tenants.id, contact.tenantId))
      .limit(1);

    if (!tenant || tenant.provider !== "meta_cloud") return { ok: false, error: "Empresa não usa Meta Cloud API" };
    if (!tenant.phoneNumberId || !tenant.accessToken) return { ok: false, error: "Credenciais WABA não configuradas" };

    await sendWelcomeTemplate(tenant.phoneNumberId, tenant.accessToken, contact.phone, contact.name ?? "");

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
