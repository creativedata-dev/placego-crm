import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  // Enums (PostgreSQL não suporta CREATE TYPE IF NOT EXISTS — usa DO block)
  await sql`DO $$ BEGIN
    CREATE TYPE waba_quality_rating AS ENUM ('GREEN', 'YELLOW', 'RED', 'UNKNOWN');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await sql`DO $$ BEGIN
    CREATE TYPE waba_tier AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4', 'UNLIMITED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await sql`DO $$ BEGIN
    CREATE TYPE waba_account_mode AS ENUM ('SANDBOX', 'LIVE');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await sql`DO $$ BEGIN
    CREATE TYPE dispatch_status AS ENUM ('pending', 'sent', 'failed', 'blocked_optout', 'quota_exceeded');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await sql`DO $$ BEGIN
    CREATE TYPE optout_source AS ENUM ('keyword', 'api', 'import', 'manual');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;
  await sql`DO $$ BEGIN
    CREATE TYPE automation_trigger AS ENUM ('contact_created', 'lead_distributed', 'reopen_conversation', 'sla_breach');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`;

  // waba_health_log
  await sql`
    CREATE TABLE IF NOT EXISTS waba_health_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      phone_number_id text NOT NULL,
      quality_rating waba_quality_rating NOT NULL DEFAULT 'UNKNOWN',
      tier waba_tier NOT NULL DEFAULT 'TIER_1',
      account_mode waba_account_mode NOT NULL DEFAULT 'LIVE',
      daily_limit integer NOT NULL DEFAULT 1000,
      sent_count integer NOT NULL DEFAULT 0,
      checked_at timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_waba_health_tenant_date ON waba_health_log(tenant_id, checked_at DESC)`;

  // message_dispatch_queue
  await sql`
    CREATE TABLE IF NOT EXISTS message_dispatch_queue (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      phone_number_id text NOT NULL,
      to_phone text NOT NULL,
      template_name text,
      template_params jsonb,
      message_text text,
      status dispatch_status NOT NULL DEFAULT 'pending',
      scheduled_at timestamp NOT NULL DEFAULT now(),
      sent_at timestamp,
      error text,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_dispatch_status ON message_dispatch_queue(status, scheduled_at)`;

  // contact_optouts
  await sql`
    CREATE TABLE IF NOT EXISTS contact_optouts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
      phone text NOT NULL,
      reason text,
      source optout_source NOT NULL DEFAULT 'manual',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_optouts_phone ON contact_optouts(phone)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_optouts_tenant_phone ON contact_optouts(tenant_id, phone)`;

  // contact_optins
  await sql`
    CREATE TABLE IF NOT EXISTS contact_optins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
      phone text NOT NULL,
      channel text NOT NULL DEFAULT 'whatsapp',
      consent_text text,
      ip text,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_optins_phone ON contact_optins(phone)`;

  // message_automations
  await sql`
    CREATE TABLE IF NOT EXISTS message_automations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name text NOT NULL,
      trigger automation_trigger NOT NULL,
      template_name text,
      template_params jsonb,
      message_text text,
      channel text NOT NULL DEFAULT 'whatsapp',
      delay_minutes integer NOT NULL DEFAULT 0,
      conditions jsonb,
      active text NOT NULL DEFAULT 'true',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `;

  // Colunas extras nos tenants (já podem existir)
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_provider text NOT NULL DEFAULT 'evolution'`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_phone_number_id text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_access_token text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_waba_id text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_verify_token text`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_optout_keywords text[] DEFAULT ARRAY['PARAR','STOP','CANCELAR','SAI','SAIR','NAO QUERO','NÃO QUERO']`;

  console.log("✓ migrate-waba concluído");
  await sql.end();
  process.exit(0);
}
run().catch(console.error);
