import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_whatsapp_provider text NOT NULL DEFAULT 'same_as_contact'`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_meta_phone_number_id text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_meta_access_token text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS broker_meta_waba_id text`;
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'tenants_broker_meta_phone_number_id_unique'
      ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_broker_meta_phone_number_id_unique UNIQUE (broker_meta_phone_number_id);
      END IF;
    END $$;
  `;
  console.log("✓ Canal de WhatsApp do corretor adicionado à tabela tenants");
  await sql.end();
  process.exit(0);
}

run().catch(console.error);
