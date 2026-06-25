# PlaceGo CRM — Documento de Escopo v2.0

**Produto:** crm.placego.com.br  
**Data:** Junho 2026  
**Status:** Em desenvolvimento — v2.0 revisado  
**Versão anterior:** v1.0 (Junho 2026) — substituída por esta revisão

---

## 1. Visão Geral

O PlaceGo CRM é uma plataforma de gestão de contatos e leads imobiliários com atendimento omnichannel e roteamento inteligente, projetada para operar em modelo híbrido: a equipe interna da PlaceGo gerencia o fluxo operacional completo, enquanto empresas parceiras (imobiliárias, incorporadoras, construtoras e corretores autônomos) acessam seus próprios leads e métricas via painel isolado.

### Diferencial central

O sistema opera em duas etapas distintas:

1. **Contato → SDR:** qualquer pessoa que interaja com a empresa por qualquer canal (WhatsApp, Instagram, Facebook, email, formulário) entra como **contato** e é distribuído automaticamente para um SDR via round-robin. O SDR qualifica o contato pelo próprio CRM, respondendo pelo canal de origem.

2. **Lead → Corretor:** após qualificação pelo SDR, o contato vira **lead** e é distribuído para corretores com base em critérios de afinidade (localização, faixa de valor, tipo de imóvel). O corretor recebe notificação via WhatsApp com link direto ao lead.

---

## 2. Ecossistema PlaceGo

```
CANAIS DE ENTRADA
──────────────────────────────────────────────────────
WhatsApp          Instagram DM      Facebook DM
Email             Comentários       Lead Ads (Meta)
Landing Pages     Portais           Manual (admin)
──────────────────────────────────────────────────────
                        │
                        ▼
        ┌───────────────────────────────┐
        │      crm.placego.com.br       │
        │                               │
        │  CONTATO → SDR (round-robin)  │
        │  Kanban SDR por atendente     │
        │  Atendimento omnichannel      │
        │                               │
        │  LEAD → Corretor (afinidade)  │
        │  Pipeline de vendas Kanban    │
        │                               │
        │  Empresa → Painel próprio     │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │       placego.com.br          │
        │  Marketplace (migrar Lovable) │
        └───────────────────────────────┘
```

---

## 3. Nomenclatura e Fluxo

### 3.1 Contato vs Lead

| Termo | Definição | Responsável |
|---|---|---|
| **Contato** | Pessoa que interagiu por qualquer canal, ainda não qualificada | SDR |
| **Lead** | Contato qualificado pelo SDR, com interesse confirmado | Corretor |

### 3.2 Fluxo completo

```
1. ENTRADA DO CONTATO
   Qualquer canal → sistema cria contato automaticamente
   OU admin cadastra manualmente com origem identificada
        │
        ▼
2. DISTRIBUIÇÃO SDR (round-robin automático)
   Contato 1 → SDR1 | Contato 2 → SDR2 | Contato 3 → SDR3
   Contato 4 → SDR1 | ... (ciclo contínuo)
        │
        ▼
3. KANBAN SDR (individual por atendente)
   Novo → Em contato → Aguardando → Qualificado | Inválido
   SDR responde pelo CRM: WhatsApp, DM, comentário, email
   Gestor vê todos com filtro por SDR
        │
        ▼ (ao mover para Qualificado)
4. CONTATO VIRA LEAD
   SDR acessa tela de routing
   Sistema sugere corretores por afinidade
   SDR seleciona corretor(es) e distribui
        │
        ▼
5. NOTIFICAÇÃO CORRETOR
   WhatsApp via Evolution API com link direto ao lead no CRM
        │
        ▼
6. KANBAN CORRETOR (pipeline de vendas)
   Novo → Contatado → Visita → Proposta → Ganho | Perdido
   Motivo de perda obrigatório
        │
        ▼
7. ACOMPANHAMENTO
   SDR vê painel duplo: qualificação + vendas dos leads distribuídos
   Admin vê funil global + filtros por SDR e corretor
   Empresa vê seus leads (sem dados de outras)
```

---

## 4. Atores e Perfis de Acesso

| Perfil | Acesso | Responsabilidade |
|---|---|---|
| **Admin PlaceGo** | Total | Cadastra contatos, configura sistema, relatórios globais, gestão de empresas |
| **SDR PlaceGo** | Kanban próprio + leads distribuídos | Qualifica contatos, atende pelo CRM, distribui leads para corretores |
| **Corretor PlaceGo** | Pipeline próprio | Atende leads atribuídos, registra interações |
| **Admin Empresa** | Painel da empresa | Vê leads da própria empresa, métricas básicas |
| **Corretor Empresa** | Leads recebidos | Pipeline próprio (leads enviados pelo SDR) |

---

## 5. Modelo Multi-Empresa (Multi-Tenant)

### 5.1 Tipos de empresa parceira
- Imobiliária
- Incorporadora
- Construtora
- Corretor autônomo

### 5.2 Estratégia de isolamento
Banco compartilhado com `company_id` em todas as tabelas + Supabase RLS.

### 5.3 Canais por empresa
Cada empresa configura seus próprios canais de atendimento com credenciais independentes. Um único app Meta (PlaceGo CRM — App ID: `1689147582125041`) recebe contatos de todas as empresas, identificadas pelo token único de cada uma.

---

## 6. Canais de Atendimento

### 6.1 Canais suportados

| Canal | Captura automática | Resposta pelo CRM | Fase |
|---|---|---|---|
| WhatsApp | Via Evolution API | ✅ Sim | Fase 2 |
| Instagram DM | Via Meta Webhook | ✅ Sim | Fase 2 |
| Facebook Messenger | Via Meta Webhook | ✅ Sim | Fase 2 |
| Comentários (Meta) | Via Meta Webhook | ✅ Sim | Fase 2 |
| Email | Via Resend Inbound | ✅ Sim | Fase 2 |
| Lead Ads (Meta) | Via Meta Webhook | — | ✅ Fase 1 |
| Landing Page | Via API | — | ✅ Fase 1 |
| Manual (admin) | Formulário CRM | — | ✅ Fase 1 |
| Portais (Zap, Viva Real) | Via Webhook | — | Fase 3 |

### 6.2 Origens de contato

```
meta_leadgen        ← formulário Lead Ads
meta_dm_instagram   ← Direct Instagram
meta_dm_facebook    ← Messenger Facebook
meta_comment        ← comentário em post/anúncio
whatsapp            ← WhatsApp recebido
email               ← email recebido
lp                  ← landing page
indicacao           ← indicação
manual              ← cadastro direto pelo admin
portal              ← portais imobiliários
```

### 6.3 Configurações por empresa e canal

Cada empresa configura por canal:
- Ativar/desativar canal
- Credenciais (token Evolution, page_id Meta, email IMAP)
- **Resposta automática de boas-vindas** (por canal)
- **Horário de atendimento** + mensagem fora do horário
- **Palavras-chave de interesse** para comentários (ex: "interesse", "preço", "quero")

---

## 7. Módulos do Sistema

### 7.1 Gestão de Canais (`/companies/[id]/channels`)
- Interface de ativação/desativação por canal
- Configuração de credenciais por canal
- Respostas automáticas e horários
- Palavras-chave de comentários

### 7.2 Captura de Contatos (`/api/contacts/capture`)
- Webhook unificado para Meta (Lead Ads, DM, comentários)
- Deduplicação por telefone/email (janela 30 dias)
- Round-robin automático para SDR disponível
- Score de qualidade por completude dos dados

### 7.3 Kanban SDR (por atendente)
- Cada SDR vê apenas seus contatos
- Colunas: Novo → Em contato → Aguardando → Qualificado | Inválido
- Interface de resposta por canal (WhatsApp, DM, email, comentário)
- Timeline unificada de todas as interações por contato
- Gestor vê todos com filtro por SDR

### 7.4 Routing de Leads
- Ativado ao mover contato para "Qualificado"
- Engine de afinidade: cidade (+35), bairro (+20), valor (+25), tipo (+20)
- Multi-select de corretores
- Notificação WhatsApp para corretor via Evolution API

### 7.5 Pipeline de Vendas — Corretor (Kanban)
- Colunas: Novo → Contatado → Visita → Proposta → Ganho | Perdido
- Drag-and-drop + avanço rápido por card
- Registro de atividades (ligação, WhatsApp, email, visita, nota)
- Motivo de perda obrigatório

### 7.6 Painel Duplo SDR
- Aba 1: Kanban de qualificação (contatos)
- Aba 2: Acompanhamento de vendas (leads distribuídos + status no pipeline)

### 7.7 Cadastro de Imóveis / Empreendimentos
- CRUD de imóveis avulsos e empreendimentos
- Vinculação à empresa parceira
- Status: Ativo, Vendido, Suspenso
- `external_id` para sync com marketplace

### 7.8 Dashboards e Relatórios
- **Admin:** funil global, volume por empresa, top SDRs, top corretores
- **SDR:** SLA de qualificação, taxa de rejeição, leads distribuídos
- **Gestor:** visão de todos os SDRs e corretores com filtros
- Exportação CSV: contatos, leads, pipeline, performance

### 7.9 Autenticação e Permissões
- Supabase Auth (email/senha)
- RBAC: admin_placego, sdr, corretor, admin_empresa, corretor_empresa
- Isolamento de dados por empresa via middleware

---

## 8. Stack Técnica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js App Router | 16.x |
| UI | shadcn/ui v4 + Tailwind CSS v4 | — |
| Componentes | Base UI (`@base-ui/react`) | — |
| Auth | Supabase Auth + `@supabase/ssr` | — |
| Banco | PostgreSQL via Supabase | — |
| ORM | Drizzle ORM | — |
| Email transacional | Resend | — |
| Email inbound | Resend Inbound | Fase 2 |
| WhatsApp | Evolution API (self-hosted ou cloud) | Fase 2 |
| Meta integração | App PlaceGo CRM (ID: 1689147582125041) | — |
| Deploy | Vercel | — |
| Repositório | github.com/creativedata-dev/placego-crm | — |

---

## 9. Schema do Banco — Versão 2.0

```sql
-- Empresas parceiras (antes: tenants)
companies (id, name, type, slug, webhook_token, created_at)

-- Usuários
users (id, email, name, role, company_id, phone, sdr_sequence_order, created_at)

-- Canais por empresa
company_channels (
  id, company_id, channel_type, is_active,
  config jsonb,           -- credenciais por canal
  welcome_message,        -- por canal
  business_hours jsonb,   -- horários de atendimento
  after_hours_message,
  keywords text[]         -- para comentários
)

-- Imóveis e empreendimentos
properties (id, company_id, type, address, neighborhood, city, price, area_m2, ...)
developments (id, company_id, name, address, city, min_price, max_price, ...)

-- Contatos (antes: leads em status new/waiting)
contacts (
  id, name, phone, email, company_id,
  origin,          -- canal de origem
  stage,           -- 'contato' | 'lead'
  source_property_id, source_development_id,
  campaign_id, ad_name, adset_name, form_name,
  utm_source, utm_medium, utm_campaign,
  quality_score,
  meta_user_id,    -- para DM e comentários
  created_at
)

-- Atribuições SDR (round-robin)
sdr_assignments (
  id, contact_id, sdr_id, assigned_at,
  status,          -- novo|em_contato|aguardando|qualificado|invalido
  qualified_at
)

-- Mensagens (timeline unificada)
contact_messages (
  id, contact_id, sdr_id,
  channel,         -- whatsapp|instagram_dm|facebook_dm|email|comment
  direction,       -- in|out
  content, meta_message_id,
  sent_at, read_at
)

-- Distribuição de leads (contatos qualificados → corretores)
lead_assignments (id, contact_id, broker_id, assigned_by_sdr_id, status, loss_reason, ...)

-- Atividades no pipeline do corretor
lead_activities (id, lead_assignment_id, user_id, type, notes, created_at)

-- Preferências de afinidade do corretor
broker_preferences (id, broker_id, cities[], neighborhoods[], min_price, max_price, property_types[], creci)
```

---

## 10. Roadmap de Desenvolvimento

### ✅ Concluído (Fases 1, 2 e 3 originais)
- Setup Next.js + Supabase + Vercel + Drizzle
- Auth RBAC com 5 roles
- CRUD Empresas, Imóveis, Corretores
- Webhook Meta Lead Ads com token por empresa
- Kanban SDR (versão inicial — sendo revisado)
- Lead Routing com engine de afinidade
- Pipeline Kanban corretor
- Notificações email (Resend)
- Dashboards Admin e SDR
- Relatórios CSV
- App Meta criado (ID: 1689147582125041)

### 🔄 Fase A — Fundação omnichannel (atual)
- [ ] Schema v2: contacts, sdr_assignments, contact_messages, company_channels
- [ ] Round-robin de SDRs
- [ ] Gestão de canais por empresa (tela de configuração)
- [ ] Formulário cadastro manual de contato (admin)
- [ ] Kanban SDR individual por atendente
- [ ] Visão gestor com filtros SDR/corretor
- [ ] Webhook Lead Ads → round-robin (atualizar existente)

### 📋 Fase B — Atendimento multicanal
- [ ] Webhook DM Instagram/Facebook
- [ ] Webhook comentários com filtro de palavras-chave por empresa
- [ ] Email inbound (Resend Inbound)
- [ ] Timeline unificada de mensagens por contato
- [ ] Interface de resposta: WhatsApp (Evolution), DM (Meta), Email
- [ ] Resposta automática de boas-vindas por canal

### 📋 Fase C — Distribuição e notificações
- [ ] Qualificar contato → vira lead → routing
- [ ] WhatsApp para corretor via Evolution API
- [ ] Painel duplo SDR (qualificação + acompanhamento vendas)
- [ ] Provisionar instância Evolution API

### 📋 Fase D — Integração e escala
- [ ] Portais imobiliários (Zap, Viva Real)
- [ ] Meta Conversions API (eventos de conversão)
- [ ] Publicar app Meta para produção (aprovação de permissões avançadas)
- [ ] Sync com marketplace placego.com.br
- [ ] Controle de acesso por plano de empresa

---

## 11. Decisões tomadas

| # | Decisão | Escolha |
|---|---|---|
| 1 | ORM | Drizzle (TypeScript-first, Edge Runtime) |
| 2 | URL empresa | `/tenant/[slug]` (não subdomínio) |
| 3 | WhatsApp | Evolution API (não Twilio) |
| 4 | Email inbound | Resend Inbound |
| 5 | App Meta | Único app PlaceGo CRM para todos os tenants |
| 6 | Nomenclatura | "Contato" antes de qualificar, "Lead" após |
| 7 | Resposta automática | Configurável por canal dentro de cada empresa |
| 8 | WhatsApp SDR | Pelo número da empresa (Evolution), não pessoal |

## 12. Decisões em aberto

| # | Decisão | Prazo |
|---|---|---|
| 1 | Modelo de monetização (pay-per-lead vs assinatura) | Antes da Fase D |
| 2 | Infraestrutura Evolution API (self-hosted vs cloud) | Antes da Fase C |
| 3 | Permissões Meta avançadas (DM + comentários) — consultar cliente | Fase B |
| 4 | Lead routing: manual vs sugestão automática por IA | Backlog |

---

## 13. Ambientes

| Ambiente | URL | Status |
|---|---|---|
| Homologação | https://placego-crm.vercel.app | ✅ Ativo |
| Produção | https://crm.placego.com.br | 📋 Após homologação |

---

## 14. Critérios de Sucesso

- Contato capturado por qualquer canal aparece no CRM em < 60 segundos
- SDR consegue qualificar e distribuir um contato em < 3 minutos
- Corretor recebe WhatsApp com link e acessa o lead sem treinamento
- Empresa vê apenas seus próprios dados
- SDR responde ao contato pelo canal de origem sem sair do CRM

---

*Documento v2.0 — Junho 2026 — PlaceGo / JCE Comunicação*
