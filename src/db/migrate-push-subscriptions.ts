import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint text NOT NULL,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id)`;
  console.log("push_subscriptions criada com sucesso");
  await sql.end();
  process.exit(0);
}

run().catch(console.error);
