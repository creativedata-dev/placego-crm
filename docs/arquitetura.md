# PlaceGo CRM — Arquitetura e Decisões Técnicas v2.0

**Versão:** 2.0 — Junho 2026

---

## Visão geral

```
CANAIS DE ENTRADA
────────────────────────────────────────────────────────────
WhatsApp · Instagram DM · Facebook Messenger · Comentários
Email · Lead Ads Meta · Landing Pages · Manual · Portais
────────────────────────────────────────────────────────────
                          │
                          ▼
        POST /api/contacts/capture?token=<empresa_token>
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│                  crm.placego.com.br                      │
│                                                          │
│  Next.js 16 (App Router) — Vercel Edge                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  Kanban SDR │  │ Lead Routing │  │ Pipeline Venda │   │
│  │ (individual)│  │  (afinidade) │  │  (corretor)    │   │
│  └─────────────┘  └──────────────┘  └────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │   Atendimento Omnichannel (Fase B)                  │ │
│  │   WhatsApp (Evolution) · DM Meta · Email (Resend)   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Server Actions ──► Drizzle ORM ──► PostgreSQL (Supabase)│
│  Supabase Auth ──► RBAC por role                         │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
              placego.com.br (marketplace — futuro)
```

---

## Fluxo de dados — Contato completo

```
1. ENTRADA
   Qualquer canal → webhook ou cadastro manual
   Sistema identifica empresa pelo token da URL
   Cria registro em contacts (stage: 'contato')

2. ROUND-ROBIN SDR
   Busca SDRs ativos ordenados por sdr_sequence_order
   Conta assignments de cada SDR (últimas 24h ou total)
   Atribui ao SDR com menor carga / próximo na sequência
   Cria registro em sdr_assignments (status: 'novo')

3. KANBAN SDR
   SDR vê contato no próprio Kanban
   Interage pelo CRM (WhatsApp Evolution, DM Meta, Email)
   Atualiza status: novo → em_contato → aguardando → qualificado | invalido

4. QUALIFICAÇÃO → LEAD
   SDR move para "Qualificado"
   contacts.stage = 'lead'
   Abre tela de routing

5. ROUTING → CORRETOR
   Engine de afinidade calcula score por corretor
   SDR seleciona corretor(es)
   Cria lead_assignments
   WhatsApp para corretor via Evolution API (link direto ao lead)

6. PIPELINE CORRETOR
   Corretor atende e avança no Kanban
   Registra atividades
   Motivo de perda obrigatório em "Perdido"

7. ACOMPANHAMENTO
   SDR vê painel duplo: qualificação + vendas dos seus leads
   Admin vê funil global + filtros por SDR e corretor
   Empresa vê apenas seus próprios dados
```

---

## Decisões arquiteturais

### 1. Contato vs Lead — dois estágios no mesmo registro
**Decisão:** campo `stage` em `contacts` em vez de tabelas separadas.

**Por quê:** evita duplicação de dados e JOINs desnecessários. O contato tem todos os dados desde o início — só o `stage` muda. A separação é conceitual, não estrutural.

**Regra:** nunca exibir a palavra "lead" na UI para contatos com `stage = 'contato'`.

---

### 2. Round-robin por contagem de assignments
**Decisão:** distribuição por menor número de assignments, não por índice circular puro.

**Por quê:** índice circular puro não considera SDRs que entraram depois ou saíram da equipe. Contagem de assignments garante distribuição equilibrada mesmo com time variável.

**Implementação:**
```sql
SELECT u.id FROM users u
LEFT JOIN sdr_assignments sa ON sa.sdr_id = u.id
  AND sa.assigned_at >= NOW() - INTERVAL '24 hours'
WHERE u.role = 'sdr'
GROUP BY u.id, u.sdr_sequence_order
ORDER BY COUNT(sa.id) ASC, u.sdr_sequence_order ASC
LIMIT 1
```

---

### 3. Um app Meta para todas as empresas
**Decisão:** app único PlaceGo CRM (ID: `1689147582125041`) com token por empresa na URL.

**Por quê:** operacionalmente mais simples — um app para gerenciar, um processo de publicação, uma configuração de webhook. Cada empresa tem token único e revogável independentemente.

**Trade-off:** se o app for suspenso pelo Meta, todas as empresas são afetadas. Mitigação: manter credenciais bem documentadas e processo de recuperação claro.

---

### 4. Next.js App Router com Server Actions (sem API REST separada)
**Decisão:** toda lógica de negócio em Server Actions, exceto webhooks e relatórios CSV.

**Por quê:** Server Actions são type-safe end-to-end, rodam no servidor, têm acesso direto ao banco. O overhead de uma API separada não se justifica no MVP.

**Quando revisar:** se surgir app mobile nativo ou integrações externas que precisem consumir uma API REST.

---

### 5. Drizzle ORM (não Prisma)
**Decisão:** Drizzle.

**Por quê:** TypeScript-first, compatível com Edge Runtime da Vercel, sintaxe SQL-like, mais leve no bundle.

**Limitação conhecida:** `drizzle-kit push` falha ao introspect schemas com constraints RLS do Supabase. Workaround: scripts de migração manual via `postgres.js` direto.

---

### 6. Multi-empresa com `company_id` compartilhado
**Decisão:** banco único com `company_id` em todas as tabelas.

**Por quê:** menor custo operacional no MVP. Supabase RLS garante isolamento.

**Quando revisar:** > 500 empresas ativas ou requisito de isolamento físico (compliance, LGPD contratual).

---

### 7. Evolution API para WhatsApp
**Decisão:** Evolution API (não Twilio).

**Por quê:** custo menor, sem necessidade de conta Twilio Business, mais flexível para o contexto brasileiro, self-hosted disponível.

**Infraestrutura:** a definir — self-hosted (VPS) ou Evolution Cloud. Decisão antes da Fase C.

---

### 8. Resend Inbound para email
**Decisão:** Resend para envio e Resend Inbound para recebimento.

**Por quê:** stack única, sem dependência adicional (vs IMAP polling ou Cloudflare Email Workers). Já usamos Resend para email transacional.

---

## Engine de afinidade (Lead Routing)

Calculada em `src/lib/routing-engine.ts`:

| Critério | Pontos |
|---|---|
| Cidade do imóvel ∈ cidades do corretor | +35 |
| Bairro do imóvel ∈ bairros do corretor | +20 |
| Preço dentro da faixa do corretor | +25 |
| Tipo do imóvel ∈ tipos do corretor | +20 |
| **Máximo** | **100** |

Agrupamento:
- ≥ 60 → Alta afinidade
- 1–59 → Afinidade parcial
- 0 → Sem critérios cadastrados

**Evolução futura:** score por histórico de conversão do corretor + sugestão automática por IA.

---

## Segurança

| Camada | Mecanismo |
|---|---|
| Autenticação | Supabase Auth (JWT em cookie httpOnly) |
| Autorização | `requireRole()` em todas as Server Actions e páginas |
| Isolamento de dados | `company_id` em queries + (futuro) RLS Supabase |
| Webhook | Token único por empresa, revogável individualmente |
| Credenciais de canal | Armazenadas em `company_channels.config` (jsonb criptografado — a implementar) |
| Variáveis sensíveis | `.env.local` / Vercel Environment Variables |

---

## Roadmap técnico

### ✅ Fase 1-3 (concluído)
- Fundação Next.js + Supabase + Drizzle + Vercel
- Auth RBAC, CRUD básico, webhook Lead Ads
- Kanban SDR (versão inicial), Lead Routing, Pipeline Corretor
- Dashboards, relatórios CSV, email Resend
- App Meta criado e configurado

### 🔄 Fase A — Fundação omnichannel (atual)
- Schema v2: contacts com stage, sdr_assignments, contact_messages, company_channels
- Round-robin de SDRs
- Kanban SDR individual por atendente
- Gestão de canais por empresa
- Formulário cadastro manual de contato

### 📋 Fase B — Atendimento multicanal
- Webhook DM Instagram/Facebook
- Webhook comentários com palavras-chave
- Email inbound (Resend Inbound)
- Interface de atendimento: timeline + resposta por canal

### 📋 Fase C — Notificações e painel duplo
- Evolution API — WhatsApp para corretor
- Painel duplo SDR (qualificação + vendas)

### 📋 Fase D — Integração e escala
- Portais imobiliários
- Meta Conversions API
- Publicação app Meta (permissões avançadas)
- Sync marketplace placego.com.br

---

## Dependências externas

| Serviço | Uso | Criticidade |
|---|---|---|
| Supabase | Auth + PostgreSQL | Alta — crítico |
| Vercel | Hospedagem | Alta — crítico |
| Meta (app PlaceGo CRM) | Captura leads/DM/comentários | Alta (operacional) |
| Resend | Email transacional + inbound | Média |
| Evolution API | WhatsApp bidirecional | Alta (Fase C) |
