# PlaceGo CRM — CLAUDE.md

Documentação técnica para desenvolvimento com IA e onboarding de devs.

---

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| UI | shadcn/ui v4 + Tailwind CSS v4 | — |
| Componentes base | Base UI (`@base-ui/react`) | — |
| Auth | Supabase Auth + `@supabase/ssr` | — |
| Banco | PostgreSQL via Supabase | — |
| ORM | Drizzle ORM | — |
| Email | Resend | — |
| WhatsApp | Evolution API | Fase C |
| Deploy | Vercel | — |

---

## Conceitos fundamentais

### Contato vs Lead
- **Contato:** pessoa que interagiu por qualquer canal, ainda não qualificada pelo SDR
- **Lead:** contato qualificado pelo SDR, distribuído para corretor
- Campo `contacts.stage`: `'contato'` | `'lead'`
- Nunca usar "lead" para se referir a um contato não qualificado no código da UI

### Round-robin de SDRs
- Ao criar um contato, o sistema atribui automaticamente ao próximo SDR da sequência
- Controlado por `users.sdr_sequence_order` + contagem de assignments por SDR
- Cria um registro em `sdr_assignments`

### Kanban SDR vs Pipeline Corretor
- **SDR:** vê apenas seus próprios contatos — colunas: novo | em_contato | aguardando | qualificado | invalido
- **Corretor:** vê apenas seus leads — colunas: novo | contacted | visiting | proposal | won | lost
- **Gestor/Admin:** vê todos com filtro por SDR e por corretor

---

## Regras críticas de desenvolvimento

### Base UI — prop `render` em vez de `asChild`
Esta versão do shadcn usa Base UI internamente. Componentes **não aceitam `asChild`**.

Para renderizar um `Button` como link:
```tsx
// ✅ correto
<Button nativeButton={false} render={<Link href="/rota" />}>
  Label
</Button>

// ❌ erro de TypeScript
<Button asChild><Link href="/rota">Label</Link></Button>
```

Para `SidebarMenuButton` (não expõe `nativeButton`):
```tsx
<SidebarMenuButton render={<Link href="/rota" />}>
  <Icon /> Label
</SidebarMenuButton>
```

Para `DropdownMenuTrigger`:
```tsx
<DropdownMenuTrigger render={<Button variant="ghost">...</Button>} />
```

### Server Components — sem event handlers inline
Nunca coloque `onClick`, `onChange` etc. em Server Components (páginas sem `"use client"`).

```tsx
// ❌ erro em runtime — Server Component
export default async function Page() {
  return <Button onClick={() => history.back()}>Cancelar</Button>
}

// ✅ usar o BackButton client component
import { BackButton } from "@/components/ui/back-button"
export default async function Page() {
  return <BackButton />
}
```

### Drizzle `db:push` com Supabase
O `drizzle-kit push` pode falhar ao introspect o schema do Supabase (bug com constraints RLS). Para adicionar colunas, use um script de migração manual:

```ts
// src/db/alguma-migracao.ts
import postgres from "postgres"
import { config } from "dotenv"
config({ path: ".env.local" })

const sql = postgres(process.env.DATABASE_URL!, { ssl: "require" })

async function run() {
  await sql`ALTER TABLE tabela ADD COLUMN IF NOT EXISTS coluna text`
  await sql.end()
  process.exit(0)
}
run().catch(console.error)
```

Rodar com: `npx tsx src/db/alguma-migracao.ts`

### Datas em queries raw SQL
O `postgres.js` na Vercel não aceita objetos `Date` como parâmetros em `db.execute(sql\`...\`)`. Sempre converter para ISO string:

```ts
// ❌ falha na Vercel
const date = new Date()
await db.execute(sql`SELECT * FROM leads WHERE created_at >= ${date}`)

// ✅ correto
const dateISO = new Date().toISOString()
await db.execute(sql`SELECT * FROM leads WHERE created_at >= ${dateISO}`)

// Para Drizzle ORM (não raw): Date funciona normalmente
db.select().from(leads).where(gte(leads.createdAt, date))
```

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (app)/               ← Rotas autenticadas (layout com sidebar)
│   │   ├── dashboard/       ← Dashboard admin com funil global
│   │   ├── tenants/         ← CRUD empresas + webhook por empresa
│   │   ├── brokers/         ← CRUD corretores + preferências afinidade
│   │   ├── properties/      ← CRUD imóveis e empreendimentos
│   │   ├── sdr/
│   │   │   ├── queue/       ← Kanban SDR (contatos por atendente)
│   │   │   ├── routing/     ← Tela de distribuição lead → corretores
│   │   │   └── dashboard/   ← Dashboard SDR com SLA e performance
│   │   ├── pipeline/        ← Kanban vendas para corretores
│   │   ├── reports/         ← Exportação CSV
│   │   └── tenant/          ← Painel da empresa parceira
│   ├── api/
│   │   ├── leads/capture/   ← Webhook Meta Lead Ads
│   │   └── reports/         ← Endpoints CSV
│   ├── auth/
│   │   ├── callback/        ← OAuth callback Supabase
│   │   └── signout/         ← Logout
│   ├── actions/             ← Server Actions
│   │   ├── tenants.ts       ← CRUD empresas + gerar/revogar webhook token
│   │   ├── properties.ts
│   │   ├── brokers.ts
│   │   ├── leads.ts         ← Ações de qualificação do SDR
│   │   ├── routing.ts       ← Distribuição lead → corretor + email
│   │   └── pipeline.ts      ← Mover kanban + registrar atividade
│   └── login/
├── components/
│   ├── ui/
│   │   └── back-button.tsx  ← Client component para navegação back
│   ├── layout/
│   │   └── app-sidebar.tsx  ← Sidebar com nav por role
│   ├── tenants/
│   └── properties/
├── db/
│   ├── index.ts             ← Instância Drizzle (singleton)
│   ├── schema/              ← Tabelas Drizzle
│   │   ├── tenants.ts       ← companies/tenants
│   │   ├── users.ts         ← users com sdr_sequence_order
│   │   ├── properties.ts    ← properties + developments
│   │   ├── leads.ts         ← contacts + sdr_assignments + lead_assignments + activities
│   │   └── brokers.ts       ← broker_preferences
│   └── seed.ts              ← Admin inicial
├── lib/
│   ├── auth.ts              ← requireAuth, requireRole, getCurrentUser
│   ├── navigation.ts        ← Itens de menu por role
│   ├── routing-engine.ts    ← Engine de score de afinidade
│   ├── email.ts             ← Templates Resend
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
└── proxy.ts                 ← Auth middleware (Next.js 16)
```

---

## Banco de dados — tabelas v2.0

```
companies            id, name, type, slug, webhook_token
users                id (= auth.uid), email, name, role, company_id, sdr_sequence_order
properties           id, company_id, type, address, neighborhood, city, price, area_m2, ...
developments         id, company_id, name, address, city, min_price, max_price, ...
leads (contacts)     id, name, phone, email, company_id, stage, origin, status,
                     source_property_id, campaign_id, ad_name, adset_name, form_name,
                     tenant_id, quality_score, sdr_id, ...
sdr_assignments      id, contact_id, sdr_id, assigned_at, status, qualified_at
contact_messages     id, contact_id, sdr_id, channel, direction, content, sent_at
lead_assignments     id, contact_id (lead), broker_id, assigned_by_sdr_id, status, loss_reason
lead_activities      id, lead_assignment_id, user_id, type, notes
broker_preferences   id, broker_id, cities[], neighborhoods[], min_price, max_price, property_types[], creci
company_channels     id, company_id, channel_type, is_active, config jsonb,
                     welcome_message, business_hours jsonb, after_hours_message, keywords[]
```

### Enums
- `company_type`: imobiliaria | incorporadora | construtora | corretor
- `user_role`: admin_placego | sdr | corretor | admin_tenant | corretor_tenant
- `contact_stage`: contato | lead
- `contact_origin`: meta_leadgen | meta_dm_instagram | meta_dm_facebook | meta_comment | whatsapp | email | lp | indicacao | manual | portal
- `sdr_assignment_status`: novo | em_contato | aguardando | qualificado | invalido
- `assignment_status`: new | contacted | visiting | proposal | won | lost
- `activity_type`: call | whatsapp | email | visit | note
- `message_channel`: whatsapp | instagram_dm | facebook_dm | email | comment
- `message_direction`: in | out
- `property_type`: apartamento | casa | comercial | terreno | cobertura | studio
- `property_status`: ativo | vendido | suspenso

---

## Roles e permissões

| Role | Acesso |
|---|---|
| `admin_placego` | Tudo — configura sistema, cadastra contatos, vê todos os SDRs/corretores |
| `sdr` | Kanban próprio de contatos, atendimento, routing para corretores |
| `corretor` | Pipeline próprio (leads recebidos) |
| `admin_tenant` | Painel da empresa (leads, imóveis, corretores vinculados) |
| `corretor_tenant` | Pipeline próprio (leads via SDR) |

---

## Webhook Meta Lead Ads

App: **PlaceGo CRM** (App ID: `1689147582125041`)  
Endpoint: `POST /api/leads/capture?token=<webhook_token_da_empresa>`

- Token único por empresa em **Empresas → Webhook**
- O mesmo token serve como `verify_token` no GET de verificação do Meta
- Deduplicação: mesmo telefone/email nos últimos 30 dias → não cria duplicado
- Score (0–100): nome(+20), telefone(+30), email(+20), campaign_id(+15), utm/ad(+15)
- Round-robin: ao receber contato, atribui automaticamente ao próximo SDR

---

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:push      # Aplicar schema (pode falhar com RLS — ver seção Drizzle)
npm run db:generate  # Gerar migrations
npm run db:studio    # Drizzle Studio
npm run db:seed      # Criar usuário admin inicial
npm run db:seed-demo # Popular com dados de teste
```

---

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Para db:seed e criação de usuários
DATABASE_URL=                      # Transaction Pooler porta 6543
RESEND_API_KEY=
META_WEBHOOK_VERIFY_TOKEN=         # Token global fallback
NEXT_PUBLIC_APP_URL=               # https://placego-crm.vercel.app (homolog)
                                   # https://crm.placego.com.br (produção)
```

> **DATABASE_URL:** usar Transaction Pooler (`aws-*.pooler.supabase.com:6543`).
> Conexão direta (`db.*.supabase.co:5432`) não funciona em redes IPv4-only.
