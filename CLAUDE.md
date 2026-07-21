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
| WhatsApp | Evolution API | ativo |
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
- **Round-robin é scoped por `tenant_id`**: SDRs de um tenant só recebem contatos do mesmo tenant
- Fallback: se não houver SDRs no tenant, usa pool global
- Controlado por `users.sdr_sequence_order` + contagem de assignments por SDR
- Cria um registro em `sdr_assignments`
- Implementado em `src/lib/round-robin.ts` — aceita `tenantId?: string | null`

### Deduplicação de contatos
- Deduplicação é **scoped por tenant_id**: mesmo telefone em tenants diferentes gera contatos separados
- Verifica phone, email e metaUserId dentro do mesmo tenant nos últimos 30 dias
- Implementado em `src/lib/contact-ingestion.ts`

### Kanban SDR vs Pipeline Corretor
- **SDR:** vê apenas seus próprios contatos — colunas: novo | em_contato | aguardando | qualificado | invalido | arquivado
- **Corretor:** vê apenas seus leads — colunas: new | contacted | visiting | proposal | won | lost
- **Gestor/Admin:** vê todos com filtro por SDR (kanban) e por corretor (pipeline)
- SDRs também podem acessar o pipeline com filtro por corretor (`/pipeline?broker=<id>`)

### Cores dos cards por coluna (Kanban/Pipeline)
Tailwind classes precisam ser **estáticas** (não geradas em runtime). Os mapas `COL_CARD_BG` ficam nos arquivos dos boards:
- `src/app/(app)/sdr/queue/sdr-kanban-board.tsx` — novo=azul, em_contato=amarelo, aguardando=laranja, qualificado=verde, distribuido=roxo, invalido=vermelho
- `src/app/(app)/pipeline/kanban-board.tsx` — new=azul, contacted=amarelo, visiting=roxo, proposal=laranja, won=verde, lost=vermelho

---

## Features implementadas

### Captura de contatos
- Webhook Meta Lead Ads: `POST /api/leads/capture?token=<webhook_token>`
- Landing Page: `POST /api/leads/lp`
- Manual via UI: `src/app/actions/contacts.ts → createContact`
- Todas as entradas passam por `src/lib/contact-ingestion.ts` (dedup + score + round-robin)

### Notificações ao corretor
- Email via Resend (`src/lib/email.ts`): inclui nome, telefone, email e notas do contato
- WhatsApp via Evolution API (`src/lib/evolution.ts`): inclui 📱 telefone, ✉️ email, 📝 notas
- Disparadas em `src/app/actions/routing.ts` ao distribuir lead

### ACK de mensagens WhatsApp
- Ticks de status nas mensagens: pendente / enviado / entregue / lido
- Gerenciado via webhook da Evolution API

### Dashboard Admin (`/dashboard`)
- 5 KPI cards com gradientes coloridos, ícones Lucide e mini barras de progresso
- Funil de leads (componente `FunnelChart`)
- Top corretores: ranking 🥇🥈🥉, badges coloridos, taxa de conversão inline
- Volume por empresa: badges coloridos por tipo, semáforo 🟢🟡🔴 na conversão

### Dashboard SDR (`/sdr/dashboard`)
- 4 KPI cards com gradientes dinâmicos (verde/amarelo/vermelho conforme limiar)
- SLA de qualificação com barras de progresso
- Breakdown de leads (qualificados / inválidos / duplicados)
- Tabela de últimas qualificações

### Kanban SDR (`/sdr/queue`)
- Desktop: drag & drop horizontal
- Mobile: accordion vertical colapsável (primeira coluna com cards auto-expandida)
- Cards com background colorido por coluna
- Badges de origem com emoji + cores por canal
- Score de qualidade, tags, ações rápidas (qualificar, distribuir, arquivar)
- Seção arquivados colapsável separada

### Pipeline Corretor (`/pipeline`)
- Desktop: drag & drop horizontal
- Mobile: accordion vertical colapsável
- Cards com background colorido por coluna
- Filtro por corretor para admin/SDR (`?broker=<id>`)
- Dialog de atividade (ligação, whatsapp, email, visita, nota)
- Dialog de motivo de perda ao mover para "lost"

### Routing SDR → Corretor (`/sdr/routing/:contactId`)
- Engine de score de afinidade (`src/lib/routing-engine.ts`)
- Apenas corretores **ativos** aparecem para distribuição
- Envia email + WhatsApp ao corretor com dados do contato

### Layout mobile
- Header com cor `bg-zinc-900` no mobile, com título da página atual via `PageTitle` component
- Sidebar fecha automaticamente ao navegar (`setOpenMobile(false)`)
- `min-w-0 overflow-x-hidden` no `<main>` para evitar overflow horizontal
- Loading skeletons nas rotas: `/sdr/queue`, `/pipeline`, `/contatos`

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

### Tailwind — classes estáticas obrigatórias
Tailwind v4 não gera classes criadas dinamicamente em runtime. Use sempre mapas estáticos:

```ts
// ❌ não funciona
const bg = `bg-${color}-50`

// ✅ mapa estático com todas as classes explícitas
const COL_CARD_BG: Record<string, string> = {
  novo: "bg-blue-50 border-blue-100",
  // ...
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
│   │   ├── dashboard/       ← Dashboard admin com funil global + KPIs coloridos
│   │   ├── tenants/         ← CRUD empresas + webhook por empresa
│   │   ├── brokers/         ← CRUD corretores + preferências afinidade (SDR pode ver)
│   │   ├── properties/      ← CRUD imóveis e empreendimentos
│   │   ├── users/           ← CRUD usuários (admin) — inclui campo empresa para SDR/corretor
│   │   ├── contatos/        ← Lista de contatos com loading skeleton
│   │   ├── sdr/
│   │   │   ├── queue/       ← Kanban SDR accordion + cores por coluna
│   │   │   │   ├── loading.tsx          ← Skeleton de carregamento
│   │   │   │   ├── sdr-kanban-board.tsx ← Board (accordion mobile + drag desktop)
│   │   │   │   └── sdr-lead-card.tsx   ← Card com origem emoji + cor + score
│   │   │   ├── routing/     ← Tela de distribuição lead → corretores (só ativos)
│   │   │   └── dashboard/   ← Dashboard SDR com SLA, KPIs coloridos e performance
│   │   ├── pipeline/        ← Kanban vendas accordion + cores por coluna
│   │   │   ├── loading.tsx             ← Skeleton de carregamento
│   │   │   ├── kanban-board.tsx        ← Board (accordion mobile + drag desktop)
│   │   │   ├── lead-card.tsx           ← Card com ações e dialogs
│   │   │   └── pipeline-broker-filter.tsx ← Filtro por corretor (admin/SDR)
│   │   ├── reports/         ← Exportação CSV
│   │   └── tenant/          ← Painel da empresa parceira
│   ├── api/
│   │   ├── leads/capture/   ← Webhook Meta Lead Ads
│   │   ├── leads/lp/        ← Webhook Landing Page
│   │   └── reports/         ← Endpoints CSV
│   ├── auth/
│   │   ├── callback/        ← OAuth callback Supabase
│   │   └── signout/         ← Logout (POST → redirect 303)
│   ├── actions/             ← Server Actions
│   │   ├── tenants.ts       ← CRUD empresas + gerar/revogar webhook token
│   │   ├── properties.ts
│   │   ├── brokers.ts       ← updateBrokerPreferences salva tenantId
│   │   ├── contacts.ts      ← createContact + updateSdrAssignmentStatus
│   │   ├── routing.ts       ← Distribuição lead → corretor + email + WhatsApp c/ dados do contato
│   │   └── pipeline.ts      ← Mover kanban + registrar atividade
│   └── login/
├── components/
│   ├── ui/
│   │   └── back-button.tsx  ← Client component para navegação back
│   ├── layout/
│   │   ├── app-sidebar.tsx  ← Sidebar com nav por role + setOpenMobile no click
│   │   └── page-title.tsx   ← Título da página atual para header mobile
│   ├── tags/
│   │   └── tag-picker.tsx   ← Seletor de tags nos cards SDR
│   ├── tenants/
│   └── properties/
├── db/
│   ├── index.ts             ← Instância Drizzle (singleton)
│   ├── schema/              ← Tabelas Drizzle
│   │   ├── tenants.ts       ← companies/tenants
│   │   ├── users.ts         ← users com sdr_sequence_order, tenant_id, is_active
│   │   ├── properties.ts    ← properties + developments
│   │   ├── leads.ts         ← contacts + sdr_assignments + lead_assignments + activities + tags
│   │   └── brokers.ts       ← broker_preferences
│   └── seed.ts              ← Admin inicial
├── lib/
│   ├── auth.ts              ← requireAuth, requireRole, getCurrentUser
│   ├── navigation.ts        ← Itens de menu por role
│   ├── contact-ingestion.ts ← Dedup (scoped por tenant) + score + round-robin
│   ├── round-robin.ts       ← Round-robin scoped por tenant_id com fallback global
│   ├── routing-engine.ts    ← Engine de score de afinidade (filtra is_active=true)
│   ├── email.ts             ← Templates Resend (inclui dados do contato)
│   ├── evolution.ts         ← WhatsApp via Evolution API (inclui dados do contato)
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
└── proxy.ts                 ← Auth middleware (Next.js 16)
```

---

## Banco de dados — tabelas v2.1

```
tenants              id, name, type, slug, webhook_token
users                id (= auth.uid), email, name, role, tenant_id, sdr_sequence_order, is_active
properties           id, tenant_id, type, address, neighborhood, city, price, area_m2, ...
developments         id, tenant_id, name, address, city, min_price, max_price, ...
leads (contacts)     id, name, phone, email, tenant_id, stage, origin, status,
                     source_property_id, campaign_id, ad_name, adset_name, form_name,
                     quality_score, sdr_id, qualified_at, ...
sdr_assignments      id, contact_id, sdr_id, assigned_at, status, qualified_at
contact_messages     id, contact_id, sdr_id, channel, direction, content, sent_at, ack
lead_assignments     id, contact_id (lead), broker_id, assigned_by_sdr_id, status, loss_reason
lead_activities      id, lead_assignment_id, user_id, type, notes
broker_preferences   id, broker_id, cities[], neighborhoods[], min_price, max_price, property_types[], creci
tags                 id, name, color, tenant_id
contact_tags         contact_id, tag_id
company_channels     id, tenant_id, channel_type, is_active, config jsonb,
                     welcome_message, business_hours jsonb, after_hours_message, keywords[]
```

### Enums
- `company_type`: imobiliaria | incorporadora | construtora | corretor
- `user_role`: admin_placego | sdr | corretor | admin_tenant | corretor_tenant
- `contact_stage`: contato | lead
- `contact_origin`: meta_leadgen | meta_dm_instagram | meta_dm_facebook | meta_comment | whatsapp | email | lp | indicacao | manual | portal
- `sdr_assignment_status`: novo | em_contato | aguardando | qualificado | invalido | arquivado | distribuido
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
| `sdr` | Kanban próprio, pipeline (com filtro corretor), página de corretores (só leitura), routing |
| `corretor` | Pipeline próprio (leads recebidos) |
| `admin_tenant` | Painel da empresa (leads, imóveis, corretores vinculados) |
| `corretor_tenant` | Pipeline próprio (leads via SDR) |

---

## Webhook Meta Lead Ads

App: **PlaceGo CRM** (App ID: `1689147582125041`)  
Endpoint: `POST /api/leads/capture?token=<webhook_token_da_empresa>`

- Token único por empresa em **Empresas → Webhook**
- O mesmo token serve como `verify_token` no GET de verificação do Meta
- Deduplicação: mesmo telefone/email **dentro do mesmo tenant** nos últimos 30 dias → não cria duplicado
- Score (0–100): nome(+20), telefone(+30), email(+20), campaign_id(+15), utm/ad(+15)
- Round-robin: ao receber contato, atribui automaticamente ao próximo SDR **do mesmo tenant**

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
npx tsx src/db/alguma-migracao.ts  # Rodar script de migração manual
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
EVOLUTION_API_URL=                 # URL da instância Evolution API
EVOLUTION_API_KEY=                 # API key da Evolution API
```

> **DATABASE_URL:** usar Transaction Pooler (`aws-*.pooler.supabase.com:6543`).
> Conexão direta (`db.*.supabase.co:5432`) não funciona em redes IPv4-only.
