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
      console.warn("[whatsapp] Meta Cloud configurado mas sem credenciais — pulando notificação");
      return;
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

  // Padrão: Evolution API
  if (!config.evolutionInstance) {
    console.warn("[whatsapp] Evolution sem instância configurada — pulando notificação");
    return;
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
    if (!config.metaPhoneNumberId || !config.metaAccessToken) return;
    return metaSendText(
      { phoneNumberId: config.metaPhoneNumberId, accessToken: config.metaAccessToken },
      phone,
      text
    );
  }
  if (!config.evolutionInstance) return;
  return evolutionSendText(config.evolutionInstance, phone, text);
}

export { metaVerifyCredentials };
