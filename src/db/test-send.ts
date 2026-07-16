import { config } from "dotenv";
config({ path: ".env.local" });

const BASE = process.env.EVOLUTION_API_URL!;
const KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = "placego-residencial-parque-alvorada";

async function send(number: string) {
  const r = await fetch(`${BASE}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ number, text: `Teste formato ${number}` }),
  });
  const d = await r.json();
  console.log(`[${number}] status: ${d.status} | key: ${d.key?.id ?? JSON.stringify(d).slice(0, 80)}`);
}

async function run() {
  // Julia S. — 559581148386
  await send("559581148386");   // com 9
  await send("5595081148386");  // com 0+9 (alguns operadores)
  await send("5595181148386");  // variação DDD

  console.log("---");

  // Iohay Timbó — 559581143042
  await send("559581143042");
  await send("5595081143042");

  process.exit(0);
}
run().catch(console.error);
