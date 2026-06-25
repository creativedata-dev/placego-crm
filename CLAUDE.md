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
| Deploy | Vercel | — |

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

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (app)/               ← Rotas autenticadas (layout com sidebar)
│   │   ├── dashboard/
│   │   ├── tenants/         ← CRUD + página de webhook por tenant
│   │   ├── brokers/         ← CRUD de corretores
│   │   ├── properties/      ← CRUD de imóveis e empreendimentos
│   │   ├── sdr/
│   │   │   ├── queue/       ← Fila de leads do SDR
│   │   │   └── routing/     ← Tela de distribuição lead → corretores
│   │   └── pipeline/        ← Kanban para corretores
│   ├── api/
│   │   └── leads/capture/   ← Webhook Meta Lead Ads
│   ├── auth/
│   │   ├── callback/        ← OAuth callback Supabase
│   │   └── signout/         ← Logout
│   ├── actions/             ← Server Actions
│   │   ├── tenants.ts
│   │   ├── properties.ts
│   │   ├── brokers.ts
│   │   ├── leads.ts
│   │   ├── routing.ts
│   │   └── pipeline.ts
│   └── login/
├── components/
│   ├── ui/                  ← shadcn/ui + componentes customizados
│   │   └── back-button.tsx  ← Client component para navegação back
│   ├── layout/
│   │   └── app-sidebar.tsx  ← Sidebar com nav por role
│   ├── tenants/
│   │   └── tenant-form.tsx
│   └── properties/
│       └── property-form.tsx
├── db/
│   ├── index.ts             ← Instância Drizzle (singleton)
│   ├── schema/              ← Tabelas Drizzle
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── properties.ts
│   │   ├── leads.ts
│   │   └── brokers.ts
│   └── seed.ts              ← Criar usuário admin inicial
├── lib/
│   ├── auth.ts              ← requireAuth, requireRole, getCurrentUser
│   ├── navigation.ts        ← Itens de menu por role
│   ├── routing-engine.ts    ← Engine de score de afinidade SDR→Corretor
│   └── supabase/
│       ├── client.ts        ← Browser client
│       ├── server.ts        ← Server client (cookies)
│       └── middleware.ts    ← updateSession para o proxy
└── proxy.ts                 ← Auth middleware (Next.js 16: proxy.ts)
```

---

## Banco de dados — tabelas

```
tenants              id, name, type, slug, webhook_token
users                id (= auth.uid), email, name, role, tenant_id
properties           id, tenant_id, type, address, neighborhood, city, price, area_m2, ...
developments         id, tenant_id, name, address, city, min_price, max_price, ...
leads                id, name, phone, email, source_property_id, origin, status, quality_score, sdr_id, ...
lead_assignments     id, lead_id, broker_id, assigned_by_sdr_id, status, loss_reason
lead_activities      id, lead_assignment_id, user_id, type, notes
broker_preferences   id, broker_id, cities[], neighborhoods[], min_price, max_price, property_types[], creci
```

### Enums
- `tenant_type`: imobiliaria | incorporadora | construtora | corretor
- `user_role`: admin_placego | sdr | corretor | admin_tenant | corretor_tenant
- `lead_status`: new | waiting | qualified | invalid | duplicate
- `lead_origin`: meta_ads | lp | manual | portal
- `assignment_status`: new | contacted | visiting | proposal | won | lost
- `activity_type`: call | whatsapp | email | visit | note
- `property_type`: apartamento | casa | comercial | terreno | cobertura | studio
- `property_status`: ativo | vendido | suspenso

---

## Roles e permissões

| Role | Acesso |
|---|---|
| `admin_placego` | Tudo — configurações, tenants, relatórios globais |
| `sdr` | Fila de leads, routing, visualização de corretores |
| `corretor` | Pipeline próprio, meus leads |
| `admin_tenant` | Painel do tenant (leads, imóveis, corretores vinculados) |
| `corretor_tenant` | Pipeline próprio (leads recebidos via SDR) |

---

## Webhook Meta Lead Ads

Endpoint: `POST /api/leads/capture?token=<webhook_token_do_tenant>`

- Token gerado por tenant em **Tenants → Webhook**
- O mesmo token serve como `verify_token` no GET de verificação do Meta
- Deduplicação automática: mesmo telefone/email nos últimos 30 dias → status `duplicate`
- Score de qualidade (0–100): nome(+20), telefone(+30), email(+20), campaign_id(+15), utm(+15)

---

## Comandos

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:push      # Aplicar schema no banco (pode falhar — ver seção Drizzle acima)
npm run db:generate  # Gerar migrations
npm run db:studio    # Drizzle Studio (visualização do banco)
npm run db:seed      # Criar usuário admin inicial
```

---

## Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Necessário para db:seed e criação de usuários
DATABASE_URL=                      # Usar Transaction Pooler (porta 6543), não conexão direta
RESEND_API_KEY=
META_WEBHOOK_VERIFY_TOKEN=         # Token global PlaceGo (fallback sem tenant)
NEXT_PUBLIC_APP_URL=
```

> **DATABASE_URL:** usar o **Transaction Pooler** do Supabase (`aws-*.pooler.supabase.com:6543`).
> A conexão direta (`db.*.supabase.co:5432`) não funciona em redes IPv4-only.
