import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = process.env.EVOLUTION_API_URL!;
const KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.argv[2] || "placego-residencial-parque-alvorada";

async function run() {
  // Buscar mensagens enviadas recentemente (fromMe: true)
  const r = await fetch(`${BASE}/chat/findMessages/${INSTANCE}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      where: { key: { fromMe: true } },
      limit: 20,
    }),
  });

  const d = await r.json();
  const messages = d.messages?.records ?? d.records ?? d ?? [];

  if (!Array.isArray(messages)) {
    console.log("Resposta inesperada:", JSON.stringify(d).slice(0, 300));
    process.exit(0);
  }

  console.log(`Últimas ${messages.length} mensagens enviadas (${INSTANCE}):\n`);
  for (const m of messages) {
    const status = m.status ?? m.ack ?? "?";
    const to = m.key?.remoteJid ?? "?";
    const text = m.message?.conversation ?? m.message?.extendedTextMessage?.text ?? "[mídia]";
    const ts = m.messageTimestamp ? new Date(Number(m.messageTimestamp) * 1000).toLocaleString("pt-BR") : "?";
    console.log(`[${ts}] → ${to}`);
    console.log(`  status: ${status} | texto: ${text.slice(0, 60)}`);
    console.log();
  }

  process.exit(0);
}
run().catch(console.error);
