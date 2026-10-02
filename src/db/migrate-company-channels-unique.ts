import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

// O código de app/actions/channels.ts (toggleChannel, saveChannelConfig) sempre assumiu um
// ON CONFLICT (company_id, channel_type), mas essa constraint nunca existiu na tabela —
// o insert duplicado só não acontecia por coincidência (cada canal era salvo uma única vez).
// Ao reaproveitar o canal "whatsapp_broker" para o canal dedicado do corretor, o segundo
// save (reconectar/alterar) colidiu e expôs o erro 42P10 "no unique or exclusion constraint
// matching the ON CONFLICT specification".
async function run() {
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'company_channels_company_id_channel_type_unique'
      ) THEN
        ALTER TABLE company_channels
          ADD CONSTRAINT company_channels_company_id_channel_type_unique UNIQUE (company_id, channel_type);
      END IF;
    END $$;
  `;
  console.log("OK: constraint única (company_id, channel_type) adicionada em company_channels");
  await sql.end();
  process.exit(0);
}
run().catch((err) => {
  console.error(err);
  process.exit(1);
});
