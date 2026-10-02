import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_evolution_instance text`;
  await sql`ALTER TABLE tenants ADD CONSTRAINT tenants_broker_evolution_instance_unique UNIQUE (broker_evolution_instance)`.catch((err) => {
    // Ignora se a constraint já existir (reexecução do script)
    if (!String(err?.message ?? "").includes("already exists")) throw err;
  });
  console.log("OK: broker_evolution_instance adicionada em tenants");

  // Novo valor do enum channel_type para a instância de ENVIO ao corretor (separada da de recebimento)
  await sql`ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'whatsapp_broker'`;
  console.log("OK: valor whatsapp_broker adicionado ao enum channel_type");

  await sql.end();
  process.exit(0);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
