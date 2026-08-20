/**
 * Meta Cloud API (WABA) — lib de integração
 * Graph API v21.0
 */

const GRAPH = "https://graph.facebook.com/v21.0";

// ── Tier → limite diário de conversas business-initiated ─────────────────────

export const TIER_LIMITS: Record<string, number> = {
  TIER_1: 1_000,
  TIER_2: 10_000,
  TIER_3: 100_000,
  TIER_4: 1_000_000,
  UNLIMITED: 999_999_999,
};

// ── Helper fetch ──────────────────────────────────────────────────────────────

async function graph(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(
      json.error?.message ?? `Meta Graph API error ${res.status}: ${JSON.stringify(json)}`
    );
  }
  return json;
}

// ── Saúde e status do número ──────────────────────────────────────────────────

export interface WabaPhoneStatus {
  phoneNumberId: string;
  displayPhone: string;
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4" | "UNLIMITED";
  accountMode: "SANDBOX" | "LIVE";
  dailyLimit: number;
  verifiedName: string;
  status: string; // CONNECTED, DISCONNECTED, etc.
}

export async function getPhoneStatus(
  phoneNumberId: string,
  token: string
): Promise<WabaPhoneStatus> {
  const data = await graph(
    `/${phoneNumberId}?fields=display_phone_number,quality_rating,messaging_limit_tier,account_mode,verified_name,code_verification_status`,
    token
  );

  const tier = (data.messaging_limit_tier ?? "TIER_1") as WabaPhoneStatus["tier"];

  return {
    phoneNumberId,
    displayPhone: data.display_phone_number ?? "",
    qualityRating: (data.quality_rating ?? "UNKNOWN") as WabaPhoneStatus["qualityRating"],
    tier,
    accountMode: (data.account_mode ?? "LIVE") as WabaPhoneStatus["accountMode"],
    dailyLimit: TIER_LIMITS[tier] ?? 1000,
    verifiedName: data.verified_name ?? "",
    status: data.code_verification_status ?? "UNKNOWN",
  };
}

// ── Templates aprovados ───────────────────────────────────────────────────────

export interface WabaTemplate {
  id: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  category: string;
  language: string;
  components: object[];
}

export async function listTemplates(
  wabaId: string,
  token: string
): Promise<WabaTemplate[]> {
  const data = await graph(
    `/${wabaId}/message_templates?fields=id,name,status,category,language,components&limit=100`,
    token
  );
  return data.data ?? [];
}

// ── Envio de mensagens ────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** Envia template HSM (business-initiated) */
export async function sendTemplate(
  phoneNumberId: string,
  token: string,
  toPhone: string,
  templateName: string,
  languageCode: string,
  components: object[] = []
) {
  return graph(`/${phoneNumberId}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(toPhone),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  });
}

/** Envia texto livre (dentro da janela de 24h) */
export async function sendText(
  phoneNumberId: string,
  token: string,
  toPhone: string,
  text: string
) {
  return graph(`/${phoneNumberId}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(toPhone),
      type: "text",
      text: { body: text, preview_url: false },
    }),
  });
}

/** Marca mensagem como lida */
export async function markAsRead(
  phoneNumberId: string,
  token: string,
  messageId: string
) {
  return graph(`/${phoneNumberId}/messages`, token, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// ── Templates específicos do CRM ──────────────────────────────────────────────

/**
 * Envia template de distribuição de lead ao corretor.
 * Template: distribuicao_lead
 * Params: {{1}} = nome do corretor, {{2}} = nome do contato, {{3}} = link CRM
 */
export async function sendLeadDistributionTemplate(
  phoneNumberId: string,
  token: string,
  brokerPhone: string,
  brokerName: string,
  contactName: string,
  assignmentId: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
  const link = `${appUrl}/pipeline/${assignmentId}`;

  return sendTemplate(phoneNumberId, token, brokerPhone, "distribuicao_lead", "pt_BR", [
    {
      type: "body",
      parameters: [
        { type: "text", text: brokerName },
        { type: "text", text: contactName },
        { type: "text", text: link },
      ],
    },
  ]);
}

/**
 * Envia template para retomar conversa fora da janela de 24h.
 * Template: iniciar_conversa
 * Params: {{1}} = nome do contato
 */
export async function sendReopenTemplate(
  phoneNumberId: string,
  token: string,
  toPhone: string,
  contactName: string
) {
  return sendTemplate(phoneNumberId, token, toPhone, "iniciar_conversa", "pt_BR", [
    {
      type: "body",
      parameters: [{ type: "text", text: contactName }],
    },
  ]);
}
