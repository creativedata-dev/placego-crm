import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = process.env.EVOLUTION_API_URL!;
const KEY = process.env.EVOLUTION_API_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.placego.com.br";

const INSTANCES = [
  "placego-residencial-parque-alvorada",
  "placego-clube-ancestral",
  "placego-manaira-empreendimentos",
];

async function run() {
  for (const instance of INSTANCES) {
    const r = await fetch(`${BASE}/webhook/set/${instance}`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: `${APP_URL}/api/evolution/webhook`,
          byEvents: false,
          base64: false,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE"],
        },
      }),
    });
    const d = await r.json();
    console.log(`[${instance}] webhook atualizado:`, d.webhook?.events ?? d);
  }
  process.exit(0);
}
run().catch(console.error);
