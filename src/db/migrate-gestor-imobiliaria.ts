import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  // Adiciona o novo valor ao enum user_role
  await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'gestor_imobiliaria'`;

  // Tabela de distribuições do gestor para corretores
  await sql`
    CREATE TABLE IF NOT EXISTS gestor_distributions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_assignment_id uuid NOT NULL REFERENCES lead_assignments(id) ON DELETE CASCADE,
      gestor_id uuid NOT NULL REFERENCES users(id),
      broker_id uuid NOT NULL REFERENCES users(id),
      assigned_at timestamp NOT NULL DEFAULT now(),
      notes text
    )
  `;

  console.log("OK: user_role enum + gestor_distributions criados");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
