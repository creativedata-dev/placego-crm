# PlaceGo CRM — Documento de Escopo v1.0

**Produto:** crm.placego.com.br  
**Data:** Junho 2026  
**Status:** Rascunho para aprovação  

---

## 1. Visão Geral

O PlaceGo CRM é uma plataforma de gestão de leads imobiliários com roteamento inteligente, projetada para operar em modelo híbrido: a equipe interna da PlaceGo gerencia o fluxo operacional completo, enquanto parceiros (imobiliárias, incorporadoras, construtoras e corretores autônomos) acessam seus próprios leads e métricas via painel isolado.

O diferencial central é o **Lead Routing pelo SDR**: um lead gerado por um imóvel/empreendimento pode ser validado e distribuído para múltiplos corretores com base em critérios de afinidade — localização, faixa de valor e características do imóvel.

---

## 2. Ecossistema PlaceGo

```
Meta Ads (Dark Posts / Lead Ads)
        │
        ▼
[ Webhook / Lead Capture API ]
        │
        ▼
┌──────────────────────────────────────┐
│         crm.placego.com.br           │  ← Escopo deste documento
│                                      │
│  SDR → Validação → Lead Routing      │
│  Corretor → Contato → Pipeline       │
│  Tenant → Painel próprio (limitado)  │
└──────────────────────────────────────┘
        │
        ▼ (cross-platform)
┌──────────────────────────────────────┐
│        placego.com.br                │  ← Marketplace (Lovable → migrar)
│  Listagem pública de imóveis         │
│  LPs de empreendimentos              │
└──────────────────────────────────────┘
```

---

## 3. Atores e Perfis de Acesso

| Perfil | Acesso | Responsabilidade |
|---|---|---|
| **Admin PlaceGo** | Total | Configuração geral, tenants, relatórios globais |
| **SDR PlaceGo** | CRM operacional | Validar leads, distribuir para corretores |
| **Corretor PlaceGo** | Pipeline próprio | Atender leads atribuídos, registrar interações |
| **Admin Tenant** | Painel do tenant | Ver leads do próprio empreendimento/imobiliária |
| **Corretor Tenant** | Leads recebidos | Acompanhar leads enviados para ele pelo SDR |

---

## 4. Modelo Multi-Tenant

### 4.1 Tipos de Tenant

- Imobiliária
- Incorporadora
- Construtora
- Corretor autônomo

### 4.2 Estratégia de Isolamento

**Banco compartilhado com `tenant_id` em todas as tabelas** (Row-Level Security via Supabase RLS).

Justificativa: menor custo operacional, mais simples de manter no MVP, e o Supabase RLS garante isolamento seguro sem infra extra por tenant. Rever para schema-per-tenant se a base ultrapassar 500 tenants ativos.

### 4.3 O que cada Tenant vê

- Leads gerados para seus imóveis/empreendimentos
- Status de cada lead no pipeline
- Histórico de contatos realizados pelos corretores
- Métricas básicas (volume, taxa de conversão, tempo médio de resposta)

O tenant **não vê** leads de outros tenants, SDRs internos, configurações de roteamento, nem dados financeiros da PlaceGo.

---

## 5. Fluxo Central de Lead

```
1. CAPTURA
   Meta Ads Lead Ad / Dark Post
   → Webhook → API PlaceGo
   → Lead criado com: nome, telefone, email, imóvel de origem, UTMs, timestamp

2. FILA SDR
   Lead entra em status: "Novo"
   SDR vê fila ordenada por timestamp + score de qualidade
   SDR faz validação (telefone válido? interesse confirmado? perfil real?)

3. VALIDAÇÃO
   SDR marca como: Qualificado | Duplicado | Inválido | Aguardando

4. LEAD ROUTING (diferencial)
   SDR qualificado → tela de distribuição
   Sistema sugere corretores com base em:
   a) Localização (bairro/cidade do imóvel vs. carteira do corretor)
   b) Faixa de valor (ticket do imóvel vs. perfil do corretor)
   c) Características (tipo: apto/casa/comercial, metragem, quartos)
   SDR seleciona 1 ou mais corretores → envia

5. ATENDIMENTO
   Corretor recebe notificação (email + futuramente WhatsApp)
   Corretor registra tentativas de contato
   Lead avança no pipeline: Novo → Contato → Visita → Proposta → Fechado / Perdido

6. ACOMPANHAMENTO
   SDR monitora SLA de resposta
   Admin PlaceGo vê funil completo
   Tenant vê seus leads
```

---

## 6. Módulos do Sistema

### 6.1 Captura de Leads (`/api/leads/capture`)
- Webhook compatível com Meta Lead Ads
- Deduplicação por telefone/email + janela de 30 dias
- Enriquecimento automático com dados do imóvel de origem
- Score inicial de qualidade (baseado em completude dos dados)

### 6.2 Fila SDR
- Lista de leads em status "Novo" e "Aguardando"
- Filtros: origem, imóvel, tenant, data
- Ações: Qualificar, Invalidar, Marcar duplicado, Encaminhar
- Histórico de tentativas de contato pelo SDR

### 6.3 Lead Routing
- Tela de distribuição com sugestão de corretores por afinidade
- Multi-select de corretores (1 lead → N corretores)
- Registro de justificativa do SDR (opcional)
- Lead "espelhado": cada corretor recebe uma cópia vinculada ao lead original
- Rastreabilidade: quem recebeu, quando, qual status cada um deu

### 6.4 Pipeline de Vendas (Kanban)
- Por corretor: visão das colunas Novo → Contatado → Visita Agendada → Proposta → Ganho / Perdido
- Drag-and-drop entre colunas
- Registro de atividades (ligação, WhatsApp, email, visita)
- Motivo de perda obrigatório ao mover para "Perdido"

### 6.5 Cadastro de Imóveis / Empreendimentos
- CRUD de imóveis (avulsos) e empreendimentos (multi-unidade)
- Atributos: tipo, endereço, bairro, cidade, valor, metragem, quartos, suítes, vagas
- Vinculação ao tenant (proprietário do imóvel)
- Status: Ativo, Vendido, Suspenso
- Integração futura: sync com marketplace placego.com.br

### 6.6 Cadastro de Corretores
- Perfil: nome, CRECI, telefone, email, regiões de atuação, faixas de valor
- Vínculo com tenant ou corretor autônomo
- Histórico de leads recebidos e conversão

### 6.7 Painel Tenant
- Acesso via subdomain ou rota: `crm.placego.com.br/tenant/[slug]`
- Visão dos leads do tenant (sem dados de outros)
- Métricas: total de leads, qualificados, em atendimento, convertidos
- Corretores vinculados ao tenant

### 6.8 Relatórios e Métricas
- Funil global (Admin PlaceGo)
- Performance por SDR (tempo médio de qualificação, taxa de rejeição)
- Performance por corretor (leads recebidos, contatos feitos, conversão)
- Volume por tenant, por imóvel, por origem (campanha Meta)
- Exportação CSV

### 6.9 Autenticação e Permissões
- Supabase Auth (email/senha + magic link)
- RBAC baseado em roles: admin_placego, sdr, corretor, admin_tenant, corretor_tenant
- RLS no banco garantindo isolamento de dados por tenant

### 6.10 Notificações
- Fase 1: Email transacional (Resend ou SendGrid)
- Fase 2: WhatsApp via Twilio (já usado na FarmaSign — reaproveitar padrão)

---

## 7. Stack Técnica

### 7.1 CRM (crm.placego.com.br)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | SSR + RSC + rotas de API integradas |
| UI | shadcn/ui + Tailwind CSS | Componentes acessíveis, customizáveis |
| Auth | Supabase Auth | Integrado ao banco, RLS nativo |
| Banco | PostgreSQL via Supabase | RLS, real-time, storage, edge functions |
| ORM | Prisma ou Drizzle | Type-safety, migrations versionadas |
| API interna | Next.js Route Handlers | Sem servidor separado no MVP |
| Hospedagem | Vercel | Deploy automático, preview por branch |
| Email | Resend | Simples, barato, boa DX |
| Webhook Meta | Next.js API Route | Endpoint dedicado para Lead Ads |

### 7.2 Banco de Dados — Estrutura Principal (esboço)

```sql
-- Tenants
tenants (id, name, type: imobiliaria|incorporadora|construtora|corretor, slug, created_at)

-- Usuários com roles
users (id, email, name, role, tenant_id nullable, created_at)
-- role: admin_placego | sdr | corretor | admin_tenant | corretor_tenant

-- Imóveis
properties (id, tenant_id, type, address, neighborhood, city, price, area_m2, bedrooms, status)

-- Empreendimentos (multi-unidade)
developments (id, tenant_id, name, address, city, min_price, max_price, status)

-- Leads
leads (id, name, phone, email, source_property_id, source_development_id, 
       origin: meta_ads|lp|manual, campaign_id, utm_source, utm_medium,
       status: new|waiting|qualified|invalid|duplicate,
       sdr_id, created_at, qualified_at)

-- Distribuição de leads
lead_assignments (id, lead_id, broker_id, assigned_by_sdr_id, assigned_at,
                  status: new|contacted|visiting|proposal|won|lost,
                  loss_reason)

-- Atividades no pipeline
lead_activities (id, lead_assignment_id, user_id, type: call|whatsapp|email|visit|note,
                 notes, created_at)

-- Critérios de afinidade do corretor (para routing)
broker_preferences (id, broker_id, cities[], neighborhoods[], min_price, max_price, 
                    property_types[])
```

### 7.3 Marketplace (placego.com.br) — Migração da Lovable

**Estratégia de migração em 3 fases:**

**Fase A — Auditoria (pré-desenvolvimento CRM)**
- Exportar schema atual do Supabase da Lovable
- Mapear todas as entidades, relações e dados existentes
- Identificar componentes React reutilizáveis no código gerado
- Documentar integrações ativas (auth, storage, edge functions)

**Fase B — CRM primeiro (paralelo ao uso da Lovable)**
- Desenvolver o CRM completo em crm.placego.com.br
- Criar schema de banco unificado (CRM + futuro marketplace)
- Definir contrato de API entre CRM e marketplace
- Lovable continua em produção sem alterações

**Fase C — Migração do Marketplace**
- Recriar o marketplace em Next.js usando o mesmo banco do CRM
- Migrar dados da Lovable para o banco unificado
- DNS cutover gradual (subdomínio de staging primeiro)
- Deprecar Lovable após validação em produção

---

## 8. Roadmap de Desenvolvimento

### Fase 1 — Fundação (Semanas 1–4)
- [ ] Setup do projeto Next.js + Supabase + Vercel
- [ ] Schema do banco (migrations com Drizzle/Prisma)
- [ ] Autenticação e RBAC (Supabase Auth + RLS)
- [ ] CRUD de Tenants, Imóveis, Corretores
- [ ] Webhook de captura de leads (Meta Lead Ads)
- [ ] Fila de leads para SDR (listagem + filtros)

### Fase 2 — Core do CRM (Semanas 5–8)
- [ ] Módulo de validação de leads pelo SDR
- [ ] Lead Routing — engine de afinidade + tela de distribuição
- [ ] Pipeline Kanban para corretores
- [ ] Registro de atividades por lead
- [ ] Notificações por email (Resend)
- [ ] Painel básico do Tenant

### Fase 3 — Métricas e Produto (Semanas 9–12)
- [ ] Dashboard Admin PlaceGo (funil, KPIs)
- [ ] Dashboard SDR (performance, SLA)
- [ ] Dashboard Corretor (pipeline pessoal)
- [ ] Relatórios com exportação CSV
- [ ] Deduplicação avançada de leads
- [ ] Score de qualidade de leads

### Fase 4 — Integração e Escala (Semanas 13–16)
- [ ] Notificações WhatsApp (Twilio)
- [ ] Sync com marketplace placego.com.br (API cross-platform)
- [ ] Monetização: controle de acesso por plano de tenant
- [ ] Auditoria e migração da Lovable (Fase A)
- [ ] Preparação da migração do marketplace (Fase B)

---

## 9. Modelo de Monetização

| Modelo | Descrição |
|---|---|
| **Pay per lead** | Tenant paga por lead qualificado recebido |
| **Assinatura mensal** | Tenant paga acesso ao painel + leads ilimitados da faixa |
| **Híbrido** | Assinatura base + pay-per-lead acima de cota |

A escolha entre esses modelos impacta o módulo de billing — a ser definida antes da Fase 3. Recomendação: começar com pay-per-lead (mais simples de implementar e validar).

---

## 10. Integrações Futuras

- **Meta Conversions API** — envio de eventos de conversão para otimização de campanhas
- **Google Ads** — captura de leads via formulários nativos
- **Portais imobiliários** — Zap Imóveis, Viva Real (webhooks de leads)
- **Assinatura digital** — contratos de compra/locação
- **BI externo** — Metabase, Looker Studio via views do PostgreSQL

---

## 11. Decisões em Aberto (a definir antes de iniciar dev)

| # | Decisão | Opções | Prazo |
|---|---|---|---|
| 1 | ORM: Prisma vs Drizzle | Prisma (maduro) vs Drizzle (mais leve, TS-first) | Antes da Fase 1 |
| 2 | Modelo de monetização inicial | Pay-per-lead vs Assinatura | Antes da Fase 3 |
| 3 | Slug de acesso tenant | Subdomínio vs rota `/tenant/[slug]` | Antes da Fase 2 |
| 4 ] Lead routing: manual (SDR) vs sugestão automática (AI) | MVP manual, AI futuramente | Backlog |

---

## 12. Critérios de Sucesso do MVP

- Lead capturado via Meta Ads chega na fila do SDR em < 60 segundos
- SDR consegue qualificar e distribuir um lead em < 3 minutos
- Corretor recebe notificação e consegue registrar primeira atividade sem treinamento
- Tenant consegue ver seus leads sem acesso a dados de outros tenants
- Zero vazamento de dados entre tenants (validado via testes RLS)

---

*Documento gerado em Junho 2026 — PlaceGo / JCE Comunicação*
