import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_coexistence boolean NOT NULL DEFAULT false`;
  // unique parcial: várias linhas podem ter NULL, mas um phone_number_id não pode repetir entre tenants
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tenants_meta_phone_number_id_unique'
      ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_meta_phone_number_id_unique UNIQUE (meta_phone_number_id);
      END IF;
    END $$;
  `;
  console.log("✓ meta_coexistence adicionada + unique em meta_phone_number_id");
  await sql.end();
  process.exit(0);
}

run().catch(console.error);
