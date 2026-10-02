// Wrapper de WhatsApp — roteia para Evolution API ou Meta Cloud API
// conforme o provider configurado no tenant, por PAPEL:
//   - canal "contato": usado pelo SDR para conversar com o contato/lead (fila, qualificação)
//   - canal "corretor": usado para notificar/conversar com o corretor na distribuição do lead
// Os dois podem apontar para provedores e credenciais diferentes.
// O código de produto (routing.ts, messages.ts, contact-ingestion.ts) deve usar apenas este módulo.

import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyBrokerNewLead as evolutionNotifyBroker, sendText as evolutionSendText } from "./evolution";
import { metaNotifyBrokerNewLead, metaSendText, metaVerifyCredentials } from "./meta-cloud";

export type WhatsAppProvider = "evolution" | "meta_cloud";
export type BrokerWhatsAppProvider = "same_as_contact" | WhatsAppProvider;

export interface TenantWhatsAppConfig {
  provider: WhatsAppProvider;
  // Evolution
  evolutionInstance?: string | null;
  // Meta Cloud
  metaPhoneNumberId?: string | null;
  metaAccessToken?: string | null;
}

/** Resolve a config do canal usado para falar com o CONTATO/LEAD (papel do SDR). */
export async function getContactWhatsAppConfig(tenantId: string): Promise<TenantWhatsAppConfig> {
  const [tenant] = await db
    .select({
      slug: tenants.slug,
      provider: tenants.whatsappProvider,
      metaPhoneNumberId: tenants.metaPhoneNumberId,
      metaAccessToken: tenants.metaAccessToken,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return { provider: "evolution" };

  return {
    provider: (tenant.provider ?? "evolution") as WhatsAppProvider,
    evolutionInstance: `placego-${tenant.slug}`,
    metaPhoneNumberId: tenant.metaPhoneNumberId,
    metaAccessToken: tenant.metaAccessToken,
  };
}

/** Resolve a config do canal usado para notificar/conversar com o CORRETOR (distribuição do lead). */
export async function getBrokerWhatsAppConfig(tenantId: string): Promise<TenantWhatsAppConfig> {
  const [tenant] = await db
    .select({
      slug: tenants.slug,
      brokerProvider: tenants.brokerWhatsappProvider,
      brokerMetaPhoneNumberId: tenants.brokerMetaPhoneNumberId,
      brokerMetaAccessToken: tenants.brokerMetaAccessToken,
      brokerEvolutionInstance: tenants.brokerEvolutionInstance,
      provider: tenants.whatsappProvider,
      metaPhoneNumberId: tenants.metaPhoneNumberId,
      metaAccessToken: tenants.metaAccessToken,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return { provider: "evolution" };

  const brokerProvider = (tenant.brokerProvider ?? "same_as_contact") as BrokerWhatsAppProvider;

  if (brokerProvider === "same_as_contact") {
    return {
      provider: (tenant.provider ?? "evolution") as WhatsAppProvider,
      evolutionInstance: `placego-${tenant.slug}`,
      metaPhoneNumberId: tenant.metaPhoneNumberId,
      metaAccessToken: tenant.metaAccessToken,
    };
  }

  // Instância Evolution dedicada ao corretor, quando configurada — senão reusa a do contato (legado).
  const evolutionInstance = tenant.brokerEvolutionInstance || `placego-${tenant.slug}`;

  return {
    provider: brokerProvider,
    evolutionInstance,
    metaPhoneNumberId: tenant.brokerMetaPhoneNumberId,
    metaAccessToken: tenant.brokerMetaAccessToken,
  };
}

export async function wpNotifyBrokerNewLead(
  config: TenantWhatsAppConfig,
  brokerPhone: string,
  brokerName: string,
  contactName: string,
  leadId: string,
  contactPhone?: string | null,
  contactEmail?: string | null,
  notes?: string | null
) {
  if (config.provider === "meta_cloud") {
    if (!config.metaPhoneNumberId || !config.metaAccessToken) {
      console.warn("[whatsapp] Meta Cloud configurado mas sem credenciais — notificação WhatsApp ignorada");
      return; // NÃO faz fallback para Evolution de outra empresa
    }
    return metaNotifyBrokerNewLead(
      { phoneNumberId: config.metaPhoneNumberId, accessToken: config.metaAccessToken },
      brokerPhone,
      brokerName,
      contactName,
      contactPhone,
      contactEmail,
      notes
    );
  }

  // Evolution: só envia se a instância do próprio tenant está configurada
  if (!config.evolutionInstance) {
    console.warn("[whatsapp] Evolution sem instância configurada — notificação WhatsApp ignorada");
    return; // NÃO usa instância de outro tenant
  }
  return evolutionNotifyBroker(
    config.evolutionInstance,
    brokerPhone,
    brokerName,
    contactName,
    leadId,
    contactPhone,
    contactEmail,
    notes
  );
}

export async function wpSendText(
  config: TenantWhatsAppConfig,
  phone: string,
  text: string
) {
  if (config.provider === "meta_cloud") {
    if (!config.metaPhoneNumberId || !config.metaAccessToken) {
      console.warn("[whatsapp] wpSendText: Meta Cloud sem credenciais — ignorado");
      return;
    }
    return metaSendText(
      { phoneNumberId: config.metaPhoneNumberId, accessToken: config.metaAccessToken },
      phone,
      text
    );
  }
  if (!config.evolutionInstance) {
    console.warn("[whatsapp] wpSendText: Evolution sem instância — ignorado");
    return;
  }
  return evolutionSendText(config.evolutionInstance, phone, text);
}

export { metaVerifyCredentials };
