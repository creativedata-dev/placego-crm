// Wrapper de WhatsApp — roteia para Evolution API ou Meta Cloud API
// conforme o whatsapp_provider configurado no tenant.
// O código de produto (routing.ts, messages.ts) deve usar apenas este módulo.

import { notifyBrokerNewLead as evolutionNotifyBroker, sendText as evolutionSendText } from "./evolution";
import { metaNotifyBrokerNewLead, metaSendText, metaVerifyCredentials } from "./meta-cloud";

export type WhatsAppProvider = "evolution" | "meta_cloud";

export interface TenantWhatsAppConfig {
  provider: WhatsAppProvider;
  // Evolution
  evolutionInstance?: string | null;
  // Meta Cloud
  metaPhoneNumberId?: string | null;
  metaAccessToken?: string | null;
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
