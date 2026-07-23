"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { metaVerifyCredentials } from "@/lib/whatsapp";

interface MetaCloudPayload {
  provider: "evolution" | "meta_cloud";
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
}

export async function saveMetaCloudConfig(
  tenantId: string,
  payload: MetaCloudPayload
): Promise<{ ok: boolean; message: string }> {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  if (currentUser.role === "admin_tenant" && currentUser.tenantId !== tenantId) {
    return { ok: false, message: "Sem permissão para alterar esta empresa." };
  }

  if (payload.provider === "meta_cloud") {
    if (!payload.metaPhoneNumberId || !payload.metaAccessToken) {
      return { ok: false, message: "Phone Number ID e Access Token são obrigatórios para a Meta Cloud API." };
    }

    // Verificar credenciais antes de salvar
    const check = await metaVerifyCredentials({
      phoneNumberId: payload.metaPhoneNumberId,
      accessToken: payload.metaAccessToken,
    });

    if (!check.ok) {
      return { ok: false, message: `Credenciais inválidas: ${check.error}` };
    }
  }

  await db.update(tenants).set({
    whatsappProvider: payload.provider,
    metaPhoneNumberId: payload.provider === "meta_cloud" ? payload.metaPhoneNumberId || null : null,
    metaAccessToken: payload.provider === "meta_cloud" ? payload.metaAccessToken || null : null,
    metaWabaId: payload.provider === "meta_cloud" ? payload.metaWabaId || null : null,
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenantId));

  revalidatePath(`/tenants/${tenantId}/whatsapp`);

  return {
    ok: true,
    message: payload.provider === "meta_cloud"
      ? "Meta Cloud API configurada e credenciais verificadas com sucesso."
      : "Provedor alterado para Evolution API.",
  };
}
