const BASE_URL = process.env.EVOLUTION_API_URL!;
const API_KEY = process.env.EVOLUTION_API_KEY!;

async function evo(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Instâncias ────────────────────────────────────────────────────────────────

export async function createInstance(instanceName: string) {
  return evo("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
    }),
  });
}

export async function getInstanceStatus(instanceName: string) {
  return evo(`/instance/connectionState/${instanceName}`);
}

export async function getQRCode(instanceName: string) {
  return evo(`/instance/connect/${instanceName}`);
}

export async function deleteInstance(instanceName: string) {
  return evo(`/instance/delete/${instanceName}`, { method: "DELETE" });
}

export async function listInstances() {
  return evo("/instance/fetchInstances");
}

export async function setInstanceWebhook(instanceName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
  return evo(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: `${appUrl}/api/evolution/webhook`,
        byEvents: true,
        base64: false,
        events: ["MESSAGES_UPSERT"],
      },
    }),
  });
}

// ── Mensagens ─────────────────────────────────────────────────────────────────

export async function sendText(
  instanceName: string,
  phone: string,
  text: string
) {
  // Normaliza o número para formato internacional sem símbolos
  const normalized = phone.replace(/\D/g, "");
  const number = normalized.startsWith("55") ? normalized : `55${normalized}`;

  return evo(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      text,
    }),
  });
}

export async function sendLinkPreview(
  instanceName: string,
  phone: string,
  text: string,
  url: string,
  title: string
) {
  const normalized = phone.replace(/\D/g, "");
  const number = normalized.startsWith("55") ? normalized : `55${normalized}`;

  return evo(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      number,
      text: `${text}\n\n${url}`,
      linkPreview: true,
    }),
  });
}

// ── Notificações específicas do CRM ──────────────────────────────────────────

export async function notifyBrokerNewLead(
  instanceName: string,
  brokerPhone: string,
  brokerName: string,
  contactName: string,
  leadId: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";
  const link = `${appUrl}/pipeline`;

  const text =
    `🏠 *PlaceGo CRM — Novo lead para você!*\n\n` +
    `Olá, *${brokerName}*!\n\n` +
    `Você recebeu um novo lead: *${contactName}*\n\n` +
    `Acesse o CRM para ver os detalhes e iniciar o atendimento:\n${link}`;

  return sendText(instanceName, brokerPhone, text);
}
