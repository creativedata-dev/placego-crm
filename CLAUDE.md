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
| Push | Web Push API + VAPID + `web-push` | ativo |
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
Tailwind classes precisam ser **estáticas** (não geradas em runtime). Os mapas ficam nos arquivos dos boards:
- `src/app/(app)/sdr/queue/sdr-kanban-board.tsx` — `COL_CARD_BG`, `COL_HEADER`, `COL_BG`
- `src/app/(app)/pipeline/kanban-board.tsx` — `COL_CARD_BG`, `COL_HEADER`, `COL_BG`
- Coluna `novo`/`new`: header `bg-blue-900` (azul marinho)
- Headers: cor sólida + texto branco. Badges contador: `bg-red-600 text-white text-sm font-black`

### Cor brand
- `#003762` definida em `src/app/globals.css` como `--color-brand` dentro do bloco `@theme inline`
- Usar classe `bg-brand` (não inline style — causa hydration mismatch em Server Components)

---

## Features implementadas

### PWA + Push Notifications
- Manifest: `public/manifest.json`, ícones: `public/icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`
- Service Worker: `public/sw.js` — cache-first estático, network-first rotas, push listener
- Middleware de auth exclui `sw.js` e `manifest.json` (matcher em `src/proxy.ts`)
- VAPID keys: `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` no `.env.local`
- Tabela `push_subscriptions` (migração: `src/db/migrate-push-subscriptions.ts`)
- `src/lib/push.ts`: `sendToUser()`, `notifySdrNewContact()`, `notifyBrokerNewLead()`
  - ⚠️ `webpush.setVapidDetails()` deve ser chamado **dentro** de `sendToUser()`, nunca no nível do módulo (quebra build Vercel)
- APIs: `POST /api/push/subscribe`, `DELETE /api/push/subscribe`, `POST /api/push/send`
- `PushSubscribe` button no `SidebarFooter`
- SDR recebe push ao receber novo contato; corretor recebe push ao receber novo lead
- Chrome Android 13+: push aparece só na barra de notificações, sem pop-up — limitação de plataforma

### Captura de contatos
- Webhook Meta Lead Ads: `POST /api/leads/capture?token=<webhook_token>`
- Landing Page: `POST /api/leads/lp`
- Manual via UI: `src/app/actions/contacts.ts → createContact`
- Todas as entradas passam por `src/lib/contact-ingestion.ts` (dedup + score + round-robin + push SDR)

### Webhook WhatsApp (Evolution API)
- `POST /api/evolution/webhook` — tipos tratados:
  - `protocolMessage`, `reactionMessage` → ignorados silenciosamente
  - texto: `conversation`, `extendedTextMessage.text`, `ephemeralMessage`
  - `locationMessage` → `📍 Localização: https://maps.google.com/?q=lat,lng`
  - `contactMessage` → `👤 Contato: displayName`
  - `pollCreationMessage` → `📊 Enquete: name`
  - mídia (image, audio, video, document, sticker, ptt) → download base64 + upload Supabase Storage
  - tipos desconhecidos sem texto → ignorados (não salva `[mensagem]`)

### Notificações ao corretor
- Email via Resend (`src/lib/email.ts`)
- WhatsApp via Evolution API (`src/lib/evolution.ts`)
- Push notification via `src/lib/push.ts`
- Disparadas em `src/app/actions/routing.ts` ao distribuir lead

### ACK de mensagens WhatsApp
- Ticks de status: pendente / enviado / entregue / lido
- Gerenciado via `messages.update` no webhook da Evolution API

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
- **Botão "Ver conversa"** (cinza chumbo) em todos os cards exceto arquivados → navega para `/sdr/contacts/[id]`
- Seção arquivados colapsável separada

### Pipeline Corretor (`/pipeline`)
- Desktop: drag & drop horizontal
- Mobile: accordion vertical colapsável
- Cards com background colorido por coluna
- Filtro por corretor para admin/SDR (`?broker=<id>`)
- **Coluna "Novo"**: botão "Entrar em Contato" (azul marinho) → move para "Em Contato" + navega para `/pipeline/[assignmentId]`
- **Coluna "Em Contato" e demais**: botão "+ Atividade" (cinza chumbo) abre dialog
- **Coluna "Perdido"**: botão arquivar (ícone Archive) → `archived=true`, some do kanban
- Leads arquivados filtrados com `ne(leadAssignments.archived, true)` na query
- Dialog de atividade (ligação, whatsapp, email, visita, nota)
- Dialog de motivo de perda ao mover para "lost"

### Página de detalhe do lead (`/pipeline/[assignmentId]`)
- Histórico de WhatsApp, dados do lead, timeline de atividades, formulário de registro
- `BackButton` com `href="/pipeline"` fixo (não `history.back()` — pode levar para rota errada)
- `ScrollToTop` client component: `window.scrollTo(0,0)` no mount para corrigir posição no mobile
- `loading.tsx` com skeleton para reduzir percepção de delay

### Página de detalhe do contato SDR (`/sdr/contacts/[id]`)
- `ScrollToTop` e `loading.tsx` skeleton (mesmo padrão do pipeline)
- `BackButton` com `label="← Fila"` volta para `/sdr/queue`

### Routing SDR → Corretor (`/sdr/routing/:contactId`)
- Engine de score de afinidade (`src/lib/routing-engine.ts`)
- Apenas corretores **ativos** aparecem para distribuição
- Envia email + WhatsApp + push ao corretor com dados do contato

### Layout mobile
- Header fixo com cor `bg-brand` no mobile, título da página via `PageTitle`
- Sidebar fecha automaticamente ao navegar (`setOpenMobile(false)`)
- `min-w-0 overflow-x-hidden` no `<main>` para evitar overflow horizontal
- Loading skeletons nas rotas: `/sdr/queue`, `/pipeline`, `/contatos`, `/pipeline/[id]`, `/sdr/contacts/[id]`

---

## Regras críticas de desenvolvimento

### Base UI — prop `render` em vez de `asChild`
Esta versão do shadcn usa Base UI internamente. Componentes **não aceitam `asChild`**.

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

### Server Components — sem event handlers inline
```tsx
// ❌ erro em runtime
export default async function Page() {
  return <Button onClick={() => history.back()}>Cancelar</Button>
}

// ✅ usar BackButton client component
import { BackButton } from "@/components/ui/back-button"
export default async function Page() {
  return <BackButton href="/pipeline" />  // href fixo quando necessário
}
```

### BackButton — usar `href` quando a rota de retorno é conhecida
`history.back()` pode levar para rota errada quando o usuário navega via `router.push()` de outra página.
```tsx
// ✅ correto — sempre volta para /pipeline
<BackButton href="/pipeline" />

// ⚠️ cuidado — depende do histórico do browser
<BackButton />  // usa history.back()
```

### Cor brand — usar classe Tailwind, não inline style
```tsx
// ❌ causa hydration mismatch em Server Components
<div style={{ backgroundColor: "#003762" }}>

// ✅ correto — definida em globals.css @theme inline
<div className="bg-brand">
```

### web-push — setVapidDetails dentro da função
```ts
// ❌ quebra o build da Vercel (env var não disponível em build time)
webpush.setVapidDetails(...)  // nível de módulo

// ✅ correto — dentro da função que envia
async function sendToUser(userId: string, ...) {
  webpush.setVapidDetails(...)  // dentro da função
}
```

### Tailwind — classes estáticas obrigatórias
```ts
// ❌ não funciona
const bg = `bg-${color}-50`

// ✅ mapa estático com todas as classes explícitas
const COL_CARD_BG: Record<string, string> = {
  novo: "bg-blue-100 border-blue-300",
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
```ts
// ❌ falha na Vercel
await db.execute(sql`SELECT * FROM leads WHERE created_at >= ${new Date()}`)

// ✅ correto
await db.execute(sql`SELECT * FROM leads WHERE created_at >= ${new Date().toISOString()}`)

// Para Drizzle ORM (não raw): Date funciona normalmente
db.select().from(leads).where(gte(leads.createdAt, date))
```

### Favicon — PNGs devem ser RGBA
Next.js exige PNGs em formato RGBA dentro do ICO. Usar `ensureAlpha()` ao gerar com sharp:
```ts
await sharp("public/logo.png")
  .resize(32, 32, { fit: "contain", background: { r:255,g:255,b:255,alpha:1 } })
  .ensureAlpha()
  .toFormat("png")
  .toBuffer()
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
│   │   ├── users/           ← CRUD usuários (admin) + botão enviar push por usuário
│   │   ├── contatos/        ← Lista de contatos com loading skeleton
│   │   ├── push-test/       ← Página de debug PWA/push (dev)
│   │   ├── sdr/
│   │   │   ├── queue/       ← Kanban SDR accordion + cores + botão "Ver conversa"
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── sdr-kanban-board.tsx
│   │   │   │   └── sdr-lead-card.tsx
│   │   │   ├── contacts/[id]/  ← Detalhe contato SDR com timeline + reply
│   │   │   │   ├── loading.tsx
│   │   │   │   └── scroll-to-top (via import do pipeline)
│   │   │   ├── routing/     ← Distribuição lead → corretores (só ativos)
│   │   │   └── dashboard/   ← Dashboard SDR com SLA, KPIs e performance
│   │   ├── pipeline/        ← Kanban vendas accordion + cores por coluna
│   │   │   ├── loading.tsx
│   │   │   ├── kanban-board.tsx
│   │   │   ├── lead-card.tsx   ← "Entrar em Contato" na col new, "Atividade" nas demais, "Arquivar" na lost
│   │   │   ├── pipeline-broker-filter.tsx
│   │   │   └── [assignmentId]/
│   │   │       ├── page.tsx        ← Detalhe lead: conversa + atividades + reply
│   │   │       ├── loading.tsx     ← Skeleton
│   │   │       ├── scroll-to-top.tsx ← Client component: window.scrollTo(0,0) no mount
│   │   │       └── note-form.tsx
│   │   ├── reports/         ← Exportação CSV
│   │   └── tenant/          ← Painel da empresa parceira
│   ├── api/
│   │   ├── leads/capture/   ← Webhook Meta Lead Ads
│   │   ├── leads/lp/        ← Webhook Landing Page
│   │   ├── evolution/webhook/ ← Webhook WhatsApp (messages.upsert + messages.update)
│   │   ├── push/subscribe/  ← Salvar/remover subscription Web Push
│   │   ├── push/send/       ← Enviar push para userId específico
│   │   ├── push/test/       ← Endpoint de teste push
│   │   └── reports/         ← Endpoints CSV
│   ├── auth/
│   │   ├── callback/        ← OAuth callback Supabase
│   │   └── signout/         ← Logout (POST → redirect 303)
│   ├── actions/
│   │   ├── tenants.ts
│   │   ├── properties.ts
│   │   ├── brokers.ts
│   │   ├── contacts.ts      ← createContact + updateSdrAssignmentStatus
│   │   ├── routing.ts       ← Distribuição + email + WhatsApp + push
│   │   └── pipeline.ts      ← moveAssignment + addActivity + archiveAssignment
│   └── login/
├── components/
│   ├── ui/
│   │   └── back-button.tsx  ← Client: onClick → href fixo ou history.back()
│   ├── layout/
│   │   ├── app-sidebar.tsx  ← PushSubscribe no SidebarFooter
│   │   └── page-title.tsx
│   ├── pwa/
│   │   ├── service-worker-register.tsx ← Registra /sw.js no mount
│   │   └── push-subscribe.tsx          ← Botão subscribe/unsubscribe com estados
│   ├── tags/
│   │   └── tag-picker.tsx
│   ├── tenants/
│   └── properties/
├── db/
│   ├── index.ts
│   ├── schema/
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── properties.ts
│   │   ├── leads.ts         ← lead_assignments tem coluna `archived boolean default false`
│   │   ├── brokers.ts
│   │   └── push.ts          ← push_subscriptions
│   └── seed.ts
├── lib/
│   ├── auth.ts
│   ├── navigation.ts
│   ├── contact-ingestion.ts ← dedup + score + round-robin + notifySdrNewContact
│   ├── round-robin.ts
│   ├── routing-engine.ts
│   ├── email.ts
│   ├── evolution.ts
│   ├── push.ts              ← sendToUser + notifySdrNewContact + notifyBrokerNewLead
│   └── supabase/
└── proxy.ts                 ← Middleware: exclui sw.js e manifest.json da auth
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
contact_messages     id, contact_id, sdr_id, channel, direction, content, sent_at, ack,
                     whatsapp_message_id, media_url, media_type
lead_assignments     id, contact_id (lead), broker_id, assigned_by_sdr_id, status,
                     loss_reason, archived, notes, updated_at
lead_activities      id, lead_assignment_id, user_id, type, notes
broker_preferences   id, broker_id, cities[], neighborhoods[], min_price, max_price, property_types[], creci
tags                 id, name, color, tenant_id
contact_tags         contact_id, tag_id
company_channels     id, tenant_id, channel_type, is_active, config jsonb,
                     welcome_message, business_hours jsonb, after_hours_message, keywords[]
push_subscriptions   id, user_id, endpoint, p256dh, auth, created_at
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

## Evolution API — endpoints

- `POST /instance/create` — body: `{ instanceName, integration, qrcode }` (sem campo webhook)
- `POST /webhook/set/:instance` — body: `{ webhook: { enabled: true, url, byEvents, base64, events } }` (chave raiz `webhook` + `enabled` obrigatórios)
- instanceName sempre `placego-${tenant.slug}` (nunca derivar do nome da empresa)
- Webhook registrado separadamente após criar instância
- Ao abrir página channels, `useEffect` registra webhook automaticamente

---

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:push      # Aplicar schema (pode falhar com RLS — usar scripts manuais)
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
NEXT_PUBLIC_VAPID_PUBLIC_KEY=      # Chave pública VAPID para Web Push
VAPID_PRIVATE_KEY=                 # Chave privada VAPID (nunca expor no cliente)
```

> **DATABASE_URL:** usar Transaction Pooler (`aws-*.pooler.supabase.com:6543`).
> Conexão direta (`db.*.supabase.co:5432`) não funciona em redes IPv4-only.
