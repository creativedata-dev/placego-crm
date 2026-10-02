"use server";

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  exchangeCodeForToken,
  subscribeAppToWaba,
  verifyPhoneBelongsToToken,
} from "@/lib/meta-embedded-signup";

interface MetaCloudPayload {
  provider: "evolution" | "meta_cloud";
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  metaVerifyToken?: string;
  metaAutoWelcome?: boolean;
}

async function assertPhoneNotUsedByAnotherTenant(
  phoneNumberId: string,
  tenantId: string,
  column: "metaPhoneNumberId" | "brokerMetaPhoneNumberId" | "brokerEvolutionInstance" = "metaPhoneNumberId"
): Promise<string | null> {
  const [conflict] = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(and(eq(tenants[column], phoneNumberId), ne(tenants.id, tenantId)))
    .limit(1);
  if (conflict) {
    return `Este identificador já está em uso pela empresa "${conflict.name}". Escolha outro.`;
  }
  return null;
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

    const conflictMessage = await assertPhoneNotUsedByAnotherTenant(payload.metaPhoneNumberId, tenantId);
    if (conflictMessage) return { ok: false, message: conflictMessage };
  }

  await db.update(tenants).set({
    whatsappProvider: payload.provider,
    metaPhoneNumberId: payload.provider === "meta_cloud" ? payload.metaPhoneNumberId || null : null,
    metaAccessToken: payload.provider === "meta_cloud" ? payload.metaAccessToken || null : null,
    metaWabaId: payload.provider === "meta_cloud" ? payload.metaWabaId || null : null,
    metaVerifyToken: payload.metaVerifyToken || null,
    metaAutoWelcome: payload.metaAutoWelcome ?? true,
    // configuração manual nunca é coexistência — só o Embedded Signup ativa essa flag
    metaCoexistence: false,
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenantId));

  revalidatePath(`/tenants/${tenantId}/whatsapp`);
  revalidatePath(`/tenants/${tenantId}/channels`);

  return {
    ok: true,
    message: payload.provider === "meta_cloud"
      ? "Meta Cloud API configurada e credenciais verificadas com sucesso."
      : "Provedor alterado para Evolution API.",
  };
}

interface EmbeddedSignupPayload {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  /** true quando o popup do Meta ofereceu e o admin optou por manter o WhatsApp Business App ativo no celular */
  coexistence: boolean;
}

export async function connectEmbeddedSignup(
  tenantId: string,
  payload: EmbeddedSignupPayload
): Promise<{ ok: boolean; message: string }> {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  if (currentUser.role === "admin_tenant" && currentUser.tenantId !== tenantId) {
    return { ok: false, message: "Sem permissão para alterar esta empresa." };
  }

  if (!payload.code || !payload.wabaId || !payload.phoneNumberId) {
    return { ok: false, message: "Retorno incompleto do signup da Meta — tente novamente." };
  }

  const conflictMessage = await assertPhoneNotUsedByAnotherTenant(payload.phoneNumberId, tenantId);
  if (conflictMessage) return { ok: false, message: conflictMessage };

  try {
    const { accessToken } = await exchangeCodeForToken(payload.code);

    const verify = await verifyPhoneBelongsToToken(payload.phoneNumberId, accessToken);
    if (!verify.ok) {
      return { ok: false, message: verify.error ?? "Token não tem acesso ao número selecionado." };
    }

    await subscribeAppToWaba(payload.wabaId, accessToken);

    await db.update(tenants).set({
      whatsappProvider: "meta_cloud",
      metaPhoneNumberId: payload.phoneNumberId,
      metaAccessToken: accessToken,
      metaWabaId: payload.wabaId,
      metaCoexistence: payload.coexistence,
      updatedAt: new Date(),
    }).where(eq(tenants.id, tenantId));

    revalidatePath(`/tenants/${tenantId}/whatsapp`);
    revalidatePath(`/tenants/${tenantId}/channels`);

    return {
      ok: true,
      message: payload.coexistence
        ? `Número ${verify.displayPhone ?? ""} conectado com coexistência — o WhatsApp Business App continua funcionando normalmente no celular.`
        : `Número ${verify.displayPhone ?? ""} conectado à Meta Cloud API.`,
    };
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "Falha ao concluir o Embedded Signup." };
  }
}

interface BrokerChannelPayload {
  provider: "same_as_contact" | "evolution" | "meta_cloud";
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaWabaId?: string;
  // Instância Evolution dedicada ao corretor. Vazio = reusa a instância do contato (legado).
  evolutionInstance?: string;
}

// Canal usado só para notificar/conversar com o CORRETOR na distribuição do lead —
// independente do canal usado pelo SDR para falar com o contato.
export async function saveBrokerChannelConfig(
  tenantId: string,
  payload: BrokerChannelPayload
): Promise<{ ok: boolean; message: string }> {
  const currentUser = await requireRole(["admin_placego", "admin_tenant"]);
  if (currentUser.role === "admin_tenant" && currentUser.tenantId !== tenantId) {
    return { ok: false, message: "Sem permissão para alterar esta empresa." };
  }

  if (payload.provider === "meta_cloud") {
    if (!payload.metaPhoneNumberId || !payload.metaAccessToken) {
      return { ok: false, message: "Phone Number ID e Access Token são obrigatórios para o canal do corretor em Meta Cloud." };
    }
    const conflictMessage = await assertPhoneNotUsedByAnotherTenant(
      payload.metaPhoneNumberId,
      tenantId,
      "brokerMetaPhoneNumberId"
    );
    if (conflictMessage) return { ok: false, message: conflictMessage };
  }

  if (payload.provider === "evolution" && payload.evolutionInstance) {
    const conflictMessage = await assertPhoneNotUsedByAnotherTenant(
      payload.evolutionInstance,
      tenantId,
      "brokerEvolutionInstance"
    );
    if (conflictMessage) return { ok: false, message: conflictMessage };
  }

  await db.update(tenants).set({
    brokerWhatsappProvider: payload.provider,
    brokerMetaPhoneNumberId: payload.provider === "meta_cloud" ? payload.metaPhoneNumberId || null : null,
    brokerMetaAccessToken: payload.provider === "meta_cloud" ? payload.metaAccessToken || null : null,
    brokerMetaWabaId: payload.provider === "meta_cloud" ? payload.metaWabaId || null : null,
    brokerEvolutionInstance: payload.provider === "evolution" ? payload.evolutionInstance || null : null,
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenantId));

  revalidatePath(`/tenants/${tenantId}/whatsapp`);
  revalidatePath(`/tenants/${tenantId}/channels`);

  const labels: Record<string, string> = {
    same_as_contact: "Mesmo canal usado com o contato",
    evolution: "Evolution API",
    meta_cloud: "Meta Cloud API",
  };

  return { ok: true, message: `Canal do corretor definido como: ${labels[payload.provider]}.` };
}
