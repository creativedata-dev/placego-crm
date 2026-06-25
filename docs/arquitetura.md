# PlaceGo CRM — Arquitetura e Decisões Técnicas

**Versão:** 1.0 — Junho 2026

---

## Visão geral

```
Meta Ads (Lead Ads / Dark Posts)
        │
        ▼  POST /api/leads/capture?token=<tenant_token>
┌─────────────────────────────────────────────────────┐
│              crm.placego.com.br                     │
│                                                     │
│  Next.js 16 (App Router) — Vercel Edge              │
│                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  SDR UI  │  │ Routing UI   │  │  Kanban UI    │ │
│  │ /sdr/    │  │ /sdr/routing │  │  /pipeline    │ │
│  └──────────┘  └──────────────┘  └───────────────┘ │
│                                                     │
│  Server Actions ──► Drizzle ORM ──► PostgreSQL      │
│  Supabase Auth ──► RLS por tenant                   │
└─────────────────────────────────────────────────────┘
        │
        ▼ (futuro)
placego.com.br (marketplace — migração da Lovable)
```

---

## Decisões arquiteturais

### 1. Next.js App Router com Server Actions (sem API separada)
**Decisão:** toda a lógica de negócio em Server Actions (`src/app/actions/`), sem API REST separada.

**Por quê:** no MVP, o overhead de manter uma API separada não justifica. Server Actions rodam no servidor, têm acesso direto ao banco e são type-safe end-to-end. O único endpoint REST explícito é o webhook do Meta, que precisa de URL pública.

**Quando revisar:** se surgir um app mobile nativo ou integração com sistemas externos que precisem consumir uma API REST convencional.

---

### 2. Drizzle ORM (não Prisma)
**Decisão:** Drizzle como ORM.

**Por quê:**
- TypeScript-first — schema definido em TS, sem geração de código
- Compatível com Edge Runtime da Vercel (Prisma tem limitações)
- Sintaxe próxima de SQL — mais fácil de otimizar queries complexas
- Mais leve no bundle

**Trade-off:** ecossistema menor, `drizzle-kit push` tem bugs pontuais com Supabase RLS (ver workaround no CLAUDE.md).

---

### 3. Multi-tenant com `tenant_id` compartilhado (não schema-per-tenant)
**Decisão:** banco único com `tenant_id` em todas as tabelas.

**Por quê:**
- Custo operacional menor — um único projeto Supabase
- Supabase RLS garante isolamento no nível do banco
- Simples de operar no MVP

**Limite:** rever para schema-per-tenant se ultrapassar 500 tenants ativos ou se surgir requisito de isolamento físico (compliance, LGPD, contratos especiais).

**RLS pendente:** as políticas RLS ainda precisam ser criadas no Supabase para garantir isolamento automático. Enquanto isso, o isolamento é garantido pelo middleware de autenticação (`requireRole`) nas Server Actions.

---

### 4. Webhook com token por tenant (não App ID por BM)
**Decisão:** cada tenant recebe um token único na URL do webhook.

**Por quê:**
- Mais simples de implementar — sem precisar registrar múltiplos Facebook Apps
- O mesmo endpoint (`/api/leads/capture`) atende todos os tenants
- Token pode ser revogado individualmente sem afetar outros
- O Meta aceita tokens customizados no campo `verify_token`

**Como funciona:**
```
POST /api/leads/capture?token=abc123def456...
  └─ lookup tenants.webhook_token = 'abc123def456...'
  └─ found → associa lead ao tenant
  └─ not found → 401 Unauthorized
```

---

### 5. URL de tenant como rota (não subdomínio)
**Decisão:** `/tenant/[slug]` em vez de `slug.crm.placego.com.br`.

**Por quê:**
- Deploy simples na Vercel — sem configuração de wildcard DNS
- Sem custo de certificado SSL por subdomínio
- Mais fácil de implementar no MVP

**Quando migrar para subdomínio:** quando os tenants exigirem white-label (marca própria na URL). Isso requer wildcard DNS na Vercel e configuração adicional.

---

### 6. Supabase Auth com SSR (`@supabase/ssr`)
**Decisão:** autenticação via Supabase com cookies gerenciados pelo `proxy.ts`.

**Por quê:** integração nativa com Next.js App Router. O `proxy.ts` (renomeado de `middleware.ts` no Next.js 16) intercepta todas as requisições, renova o token de sessão e redireciona para `/login` se não autenticado.

**Proxy.ts:** no Next.js 16, `middleware.ts` foi renomeado para `proxy.ts` e a função exportada de `middleware` para `proxy`.

---

## Fluxo de dados — Lead completo

```
1. Meta Lead Ad preenchido pelo usuário
        │
        ▼
2. POST /api/leads/capture?token=<token_do_tenant>
   - Valida token → encontra tenant_id
   - Extrai campos do payload Meta (field_data[])
   - Deduplica por telefone/email (janela 30 dias)
   - Calcula quality_score (0–100)
   - Insere em leads (status: 'new')
        │
        ▼
3. SDR vê lead na Fila (/sdr/queue)
   - Filtra por status, origem
   - Valida manualmente (liga para o lead)
   - Ação: qualificar | invalidar | duplicar | aguardar
        │
        ▼
4. SDR distribui (/sdr/routing/[leadId])
   - routing-engine.ts calcula score de afinidade por corretor
   - SDR seleciona 1..N corretores
   - Cria N lead_assignments (lead espelhado)
   - Lead atualizado para status: 'qualified'
        │
        ▼
5. Corretor recebe no Pipeline (/pipeline)
   - lead_assignment.status: 'new'
   - Avança no Kanban: contacted → visiting → proposal → won/lost
   - Registra atividades (call, whatsapp, email, visit, note)
   - Motivo de perda obrigatório em 'lost'
```

---

## Engine de afinidade (Lead Routing)

O score é calculado em `src/lib/routing-engine.ts` comparando atributos do imóvel de origem com as preferências do corretor:

| Critério | Pontos |
|---|---|
| Cidade do imóvel ∈ cidades do corretor | +35 |
| Bairro do imóvel ∈ bairros do corretor | +20 |
| Preço do imóvel dentro da faixa do corretor | +25 |
| Tipo do imóvel ∈ tipos do corretor | +20 |
| **Máximo** | **100** |

Agrupamento visual:
- ≥ 60 → Alta afinidade
- 1–59 → Afinidade parcial
- 0 → Sem critérios

**Evolução futura:** score baseado em histórico de conversão do corretor (taxa de conversão por faixa de valor, por bairro) e sugestão automática via IA.

---

## Segurança

| Camada | Mecanismo |
|---|---|
| Autenticação | Supabase Auth (JWT em cookie httpOnly) |
| Autorização | `requireRole()` em todas as Server Actions e páginas |
| Isolamento de dados | `tenant_id` em queries + (futuro) RLS Supabase |
| Webhook | Token único por tenant, revogável individualmente |
| Variáveis sensíveis | `.env.local` (nunca commitado) |

---

## Roadmap técnico

### Fase 2 (atual)
- [x] Webhook Meta com token por tenant
- [x] Fila SDR com filtros e ações
- [x] Lead Routing com engine de afinidade
- [x] Pipeline Kanban com atividades
- [ ] Notificações por email (Resend) ao distribuir lead
- [ ] Painel do Tenant

### Fase 3
- [ ] Dashboard Admin com KPIs e funil
- [ ] Dashboard SDR (SLA, performance)
- [ ] Relatórios com exportação CSV
- [ ] Deduplicação avançada (fuzzy match por nome+telefone)
- [ ] Lead scoring com histórico

### Fase 4
- [ ] Notificações WhatsApp (Twilio)
- [ ] RLS Supabase em todas as tabelas
- [ ] Sync com marketplace placego.com.br
- [ ] Controle de acesso por plano de tenant
- [ ] Migração do marketplace da Lovable

---

## Dependências externas

| Serviço | Uso | Criticidade |
|---|---|---|
| Supabase | Auth + banco PostgreSQL | Alta — todo o sistema depende |
| Vercel | Hospedagem e deploy | Alta |
| Meta Business Manager | Fonte de leads via webhook | Alta (operacional) |
| Resend | Email transacional | Média — fallback: email manual |
| Twilio (futuro) | WhatsApp | Baixa — fase 4 |
