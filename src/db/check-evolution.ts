import { config } from "dotenv";
config({ path: ".env.local" });

async function run() {
  const BASE = process.env.EVOLUTION_API_URL!;
  const KEY = process.env.EVOLUTION_API_KEY!;

  const res = await fetch(`${BASE}/instance/fetchInstances`, {
    headers: { apikey: KEY },
  });
  const data = await res.json();
  console.log("Instâncias:", JSON.stringify(data, null, 2));

  // Testar envio direto para a instância do novo número
  const instanceName = process.argv[2];
  const phone = process.argv[3];
  if (instanceName && phone) {
    console.log(`\nTestando envio para ${phone} via instância ${instanceName}...`);
    const r = await fetch(`${BASE}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ number: phone, text: "Teste CRM ✅" }),
    });
    const d = await r.json();
    console.log("Resultado:", JSON.stringify(d, null, 2));
  }

  process.exit(0);
}
run().catch(console.error);
