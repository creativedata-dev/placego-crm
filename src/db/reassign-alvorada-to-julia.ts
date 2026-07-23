import postgres from "postgres";
import { config } from "dotenv";
config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" });

const TATIANA_ID = "061e8b47-19d9-4ef4-b64e-3e02c95fbcee";
const JULIA_ID   = "4bc1b42f-60bd-49e3-9229-bff9d72ddbc5";
const ALVORADA_ID = "1f495924-9d83-4bbf-82e7-1f1d3feb4ae8";

async function run() {
  const result = await sql`
    UPDATE sdr_assignments sa
    SET sdr_id = ${JULIA_ID}, updated_at = NOW()
    FROM leads l
    WHERE sa.contact_id = l.id
      AND sa.sdr_id = ${TATIANA_ID}
      AND l.tenant_id = ${ALVORADA_ID}
      AND sa.status NOT IN ('arquivado', 'distribuido')
    RETURNING sa.id, l.name as contact_name
  `;

  console.log(`Transferidos ${result.length} contatos da Tatiana → Julia:`);
  result.forEach((r: any) => console.log(`  - ${r.contact_name} (assignment ${r.id})`));

  // Também atualiza o sdr_id no lead para consistência
  await sql`
    UPDATE leads l
    SET sdr_id = ${JULIA_ID}, updated_at = NOW()
    FROM sdr_assignments sa
    WHERE sa.contact_id = l.id
      AND sa.sdr_id = ${JULIA_ID}
      AND l.tenant_id = ${ALVORADA_ID}
      AND l.sdr_id = ${TATIANA_ID}
  `;

  console.log("sdr_id nos leads atualizado.");
  await sql.end();
  process.exit(0);
}

run().catch(console.error);
