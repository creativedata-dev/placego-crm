// Meta Cloud API — WhatsApp Business API oficial
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages

const META_API_VERSION = "v20.0";
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaCloudConfig {
  phoneNumberId: string;
  accessToken: string;
}

async function metaFetch(path: string, body: object, accessToken: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message ?? `Meta API error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export async function metaSendText(
  config: MetaCloudConfig,
  phone: string,
  text: string
) {
  return metaFetch(
    `/${config.phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(phone),
      type: "text",
      text: { preview_url: false, body: text },
    },
    config.accessToken
  );
}

export async function metaSendMedia(
  config: MetaCloudConfig,
  phone: string,
  mediaType: "image" | "video" | "document" | "audio",
  mediaUrl: string,
  caption?: string,
  filename?: string
) {
  const mediaBody: Record<string, any> = { link: mediaUrl };
  if (caption && mediaType !== "audio") mediaBody.caption = caption;
  if (filename && mediaType === "document") mediaBody.filename = filename;

  return metaFetch(
    `/${config.phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(phone),
      type: mediaType,
      [mediaType]: mediaBody,
    },
    config.accessToken
  );
}

// Primeiro contato: template de aviso (pede confirmação antes de enviar dados)
export async function metaNotifyBrokerNewLead(
  config: MetaCloudConfig,
  brokerPhone: string,
  brokerName: string,
  contactName: string,
  contactPhone?: string | null,
  contactEmail?: string | null,
  notes?: string | null
) {
  return metaFetch(
    `/${config.phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: normalizePhone(brokerPhone),
      type: "template",
      template: {
        name: "template_envio_de_lead",
        language: { code: "pt_BR" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: brokerName }],
          },
        ],
      },
    },
    config.accessToken
  );
}

// Segundo contato: dados completos do lead (enviado após corretor confirmar)
export async function metaSendLeadDetails(
  config: MetaCloudConfig,
  brokerPhone: string,
  brokerName: string,
  lead: {
    name: string;
    phone?: string | null;
    email?: string | null;
    development?: string | null;
    createdAt?: Date | null;
    assignmentId?: string | null;
    notes?: string | null;
  }
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
  const link = lead.assignmentId ? `${appUrl}/pipeline/${lead.assignmentId}` : `${appUrl}/pipeline`;
  const date = lead.createdAt
    ? new Date(lead.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  const text = [
    `🏠 *Dados do lead — PlaceGo CRM*`,
    ``,
    `👤 *Nome:* ${lead.name}`,
    lead.phone ? `📱 *WhatsApp:* ${lead.phone}` : null,
    lead.email ? `✉️ *E-mail:* ${lead.email}` : null,
    lead.development ? `🏢 *Empreendimento:* ${lead.development}` : null,
    `📅 *Chegou em:* ${date}`,
    lead.notes ? `📝 *Obs:* ${lead.notes}` : null,
    ``,
    `🔗 *Acesse o CRM:*`,
    link,
  ].filter((l) => l !== null).join("\n");

  return metaSendText(config, brokerPhone, text);
}

// Verificar se as credenciais estão válidas
export async function metaVerifyCredentials(config: MetaCloudConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(
      `${BASE_URL}/${config.phoneNumberId}?fields=display_phone_number,verified_name&access_token=${config.accessToken}`
    );
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message ?? "Credenciais inválidas" };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
