import postgres from 'postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Atualizar banco para o novo auth ID: 018be2cc-ad69-4d34-80d4-fe6bd5ac1de6
const OLD = '0042cb8c-80d1-49ae-a4a4-3751dfd89001';
const NEW = '018be2cc-ad69-4d34-80d4-fe6bd5ac1de6';

// Atualizar tabelas dependentes primeiro (sem FK para users sendo alterada ainda)
await sql.unsafe(`UPDATE lead_activities SET user_id = '${NEW}' WHERE user_id = '${OLD}'`);
await sql.unsafe(`UPDATE contact_messages SET sdr_id = '${NEW}' WHERE sdr_id = '${OLD}'`);
await sql.unsafe(`UPDATE leads SET sdr_id = '${NEW}' WHERE sdr_id = '${OLD}'`);
await sql.unsafe(`UPDATE sdr_assignments SET sdr_id = '${NEW}' WHERE sdr_id = '${OLD}'`);
await sql.unsafe(`UPDATE lead_assignments SET assigned_by_sdr_id = '${NEW}' WHERE assigned_by_sdr_id = '${OLD}'`);
await sql.unsafe(`UPDATE lead_assignments SET broker_id = '${NEW}' WHERE broker_id = '${OLD}'`);
// Por último o users (sem FKs apontando para ele agora)
await sql.unsafe(`UPDATE users SET id = '${NEW}' WHERE id = '${OLD}'`);

const rows = await sql.unsafe(`SELECT id, name, email, role FROM users WHERE email = 'synapseiqadm@gmail.com'`);
console.log('corrigido:', rows);
await sql.end();
process.exit(0);
