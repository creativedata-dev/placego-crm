# PlaceGo CRM — Documento de Escopo

**Versão:** 1.0  
**Data:** Agosto 2026  
**Status:** Em produção (https://crm.placego.com.br)

---

## 1. Visão Geral

O **PlaceGo CRM** é uma plataforma de gestão de relacionamento com clientes voltada para o mercado imobiliário. O sistema conecta múltiplas empresas (imobiliárias, incorporadoras, construtoras e corretores autônomos) em uma única plataforma multi-tenant, com atendimento omnichannel — WhatsApp, Instagram, Facebook, Email, formulários e portais.

O fluxo central é:

```
Contato entra por qualquer canal
        ↓
Sistema deduplica e atribui ao SDR (round-robin)
        ↓
SDR qualifica o contato no kanban
        ↓
SDR distribui para o corretor mais adequado (score de afinidade)
        ↓
Corretor acompanha o lead no pipeline de vendas
```

---

## 2. Perfis de Usuário (Roles)

| Role | Descrição |
|---|---|
| `admin_placego` | Administrador da plataforma. Acesso total: empresas, usuários, contatos, pipeline, relatórios |
| `sdr` | Pré-vendedor. Recebe contatos, qualifica e distribui para corretores |
| `corretor` | Corretor interno PlaceGo. Recebe leads qualificados e gerencia pipeline de vendas |
| `admin_tenant` | Administrador de empresa parceira. Vê leads, imóveis e corretores do seu tenant |
| `corretor_tenant` | Corretor vinculado a empresa parceira. Vê apenas seus próprios leads |

---

## 3. Módulos Implementados

### 3.1 Autenticação e Acesso
- Login com email/senha via Supabase Auth
- Sessões persistentes com SSR (`@supabase/ssr`)
- Proteção de rotas por role via middleware (`src/proxy.ts`)
- Logout via POST `/auth/signout`
- Redirect automático após login conforme role

### 3.2 Multi-Tenant (Empresas)
- Cada empresa tem seu próprio `tenant_id` no banco
- Dados isolados por tenant: contatos, canais, imóveis, corretores
- Slug único por empresa (`tenant.slug`) para identificar instâncias WhatsApp
- Webhook token único por empresa para integração Meta Lead Ads
- **Tipos de empresa:** imobiliária | incorporadora | construtora | corretor autônomo

### 3.3 Captura de Contatos (Entrada)

#### Meta Lead Ads
- Webhook `POST /api/leads/capture?token=<token_empresa>`
- Token único por empresa configurado em **Empresas → Webhook**
- Verificação GET automática do Meta (mesmo token)

#### WhatsApp (Evolution API)
- Webhook `POST /api/evolution/webhook`
- Instância por empresa: `placego-{slug}`
- QR Code por empresa em **Empresas → Canais → WhatsApp**
- Tipos de mensagem suportados: texto, imagem, áudio, vídeo, documento, sticker, localização, contato, enquete
- Reactions e tipos desconhecidos ignorados silenciosamente
- Mídia: download via Evolution API + upload no Supabase Storage

#### Email Inbound
- Recebimento via Forward Email (forwardemail.net)
- Webhook `POST /api/email/inbound`
- Email: contato@placego.com.br

#### Landing Page
- Webhook `POST /api/leads/lp`

#### Cadastro Manual
- Formulário via UI para `admin_placego` e `sdr`

### 3.4 Pipeline de Ingestão (`src/lib/contact-ingestion.ts`)
Todas as entradas passam pela mesma função central:

1. **Deduplicação** — verifica phone/email/metaUserId no mesmo tenant nos últimos 30 dias
2. **Score de qualidade** (0–100) — nome(+20), telefone(+30), email(+20), campaign_id(+15), utm/ad(+15)
3. **Round-robin SDR** — atribui ao próximo SDR do tenant (fallback: pool global)
4. **Push notification** — notifica o SDR designado via Web Push
5. **Registro de mensagem** — salva em `contact_messages` para timeline

### 3.5 Kanban SDR (`/sdr/queue`)

**Colunas:**
| Status | Descrição |
|---|---|
| Novo | Recém chegado, ainda sem contato |
| Em Contato | SDR iniciou contato |
| Aguardando | Aguardando resposta do contato |
| Qualificado | Pronto para distribuição ao corretor |
| Inválido | Contato sem potencial |
| Arquivado | Encerrado, oculto do kanban |
| Distribuído | Lead enviado para corretor |

**Funcionalidades:**
- Desktop: drag & drop entre colunas
- Mobile: accordion vertical colapsável
- Botão **"Ver conversa"** em cada card → abre página com histórico completo
- Score de qualidade visível no card
- Tags coloridas por contato
- Badges de origem com emoji (Meta, WhatsApp, Email, LP etc.)
- Ações rápidas: qualificar ✓, distribuir →, arquivar
- Seção "Arquivados" colapsável separada
- Loading skeleton durante carregamento
- Scroll automático ao topo ao abrir contato no mobile

### 3.6 Página de Contato SDR (`/sdr/contacts/[id]`)
- Timeline de mensagens (conversa WhatsApp, email, DMs)
- Formulário de resposta por canal (WhatsApp, Email, Instagram DM, Facebook DM)
- Status de entrega das mensagens (ticks: pendente / enviado / entregue / lido)
- Dados do contato (nome, telefone, email, origem, score)
- Ações de status (qualificar, marcar como inválido)
- Tags editáveis inline
- Edição de dados do contato

### 3.7 Distribuição de Leads (`/sdr/routing/[contactId]`)
- Engine de score de afinidade (`src/lib/routing-engine.ts`)
- Critérios: cidade, bairro, faixa de preço, tipo de imóvel, CRECI
- Apenas corretores **ativos** aparecem para seleção
- Ao distribuir: envia **email** (Resend) + **WhatsApp** (Evolution API) + **push notification** ao corretor

### 3.8 Pipeline Corretor (`/pipeline`)

**Colunas:**
| Status | Descrição |
|---|---|
| Novo | Lead recebido, ainda não contatado |
| Em Contato | Corretor iniciou contato |
| Visita Agendada | Visita ao imóvel agendada |
| Proposta | Proposta enviada |
| Ganho | Venda concluída |
| Perdido | Lead perdido (requer motivo) |

**Funcionalidades:**
- Desktop: drag & drop entre colunas
- Mobile: accordion vertical colapsável
- Coluna **"Novo"**: botão "Entrar em Contato" → move para "Em Contato" + abre página do lead
- Demais colunas: botão "+ Atividade" para registrar interações
- Coluna **"Perdido"**: botão arquivar (lead some do kanban)
- Dialog de motivo obrigatório ao mover para "Perdido"
- Filtro por corretor para admin/SDR (`?broker=<id>`)
- Leads arquivados filtrados automaticamente da view
- Loading skeleton durante carregamento

### 3.9 Página de Lead (`/pipeline/[assignmentId]`)
- Histórico completo de mensagens WhatsApp
- Formulário de envio de mensagem por canal
- Registro de atividades (ligação, WhatsApp, email, visita, nota)
- Timeline de atividades do corretor + notas do SDR
- Dados do lead com badges de status, origem, score
- Botão **"Fechar"** retorna ao pipeline
- Scroll automático ao topo no mobile

### 3.10 Notificações

#### Email (Resend)
- Template com nome, telefone, email e notas do contato
- Enviado ao corretor ao receber novo lead

#### WhatsApp (Evolution API)
- Mensagem formatada com dados do lead
- Enviado ao corretor ao receber novo lead

#### Web Push (PWA)
- SDR notificado ao receber novo contato
- Corretor notificado ao receber novo lead
- Funciona com app em background (Android)
- iOS 16.4+: funciona apenas com PWA instalado na tela inicial

### 3.11 PWA (Progressive Web App)
- Manifest com ícones 192px, 512px e maskable
- Service Worker: cache-first para assets, network-first para rotas
- Instalável no Android e iOS (via Safari)
- Botão de subscribe/unsubscribe no sidebar
- Subscriptions salvas por usuário no banco (`push_subscriptions`)

### 3.12 Imóveis e Empreendimentos (`/properties`)
- Cadastro de imóveis avulsos (tipo, endereço, bairro, cidade, valor, área)
- Cadastro de empreendimentos (lançamentos com faixa de preço)
- Associados a empresas (tenant)
- Usados no engine de score de afinidade

### 3.13 Corretores (`/brokers`)
- Cadastro com CRECI, cidades, bairros, faixa de preço e tipos de imóvel
- Campo `is_active` — só corretores ativos recebem leads
- SDR pode visualizar corretores (sem editar)

### 3.14 Usuários (`/users`)
- CRUD completo (admin_placego)
- Campos: nome, email, role, empresa, is_active, sdr_sequence_order
- Botão de envio de push notification individual (teste/comunicação)

### 3.15 Dashboards

#### Admin PlaceGo (`/dashboard`)
- 5 KPIs: total de contatos, leads qualificados, distribuídos, conversão, tempo médio
- Funil de conversão visual
- Ranking de corretores (🥇🥈🥉) com taxa de conversão
- Volume por empresa com semáforo de performance

#### SDR (`/sdr/dashboard`)
- 4 KPIs com cores dinâmicas (verde/amarelo/vermelho por limiar)
- SLA de qualificação com barras de progresso
- Breakdown: qualificados / inválidos / duplicados
- Tabela de últimas qualificações

### 3.16 Relatórios (`/reports`)
- Exportação CSV de contatos e leads
- Filtros por período, empresa, status

---

## 4. Integrações

| Sistema | Uso | Status |
|---|---|---|
| **Evolution API** (Railway) | WhatsApp por empresa — envio, recebimento, QR Code | ✅ Produção |
| **Meta Lead Ads** | Captura de leads de campanhas no Facebook/Instagram | ✅ Produção |
| **Resend** | Envio de emails transacionais ao corretor | ✅ Produção |
| **Forward Email** | Recebimento de email inbound | ✅ Produção |
| **Supabase Storage** | Armazenamento de mídias (imagens, áudios do WhatsApp) | ✅ Produção |
| **Supabase Auth** | Autenticação e gestão de sessões | ✅ Produção |
| **Vercel** | Deploy e hosting | ✅ Produção |
| **Web Push API** | Push notifications nativas (PWA) | ✅ Produção |

---

## 5. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | shadcn/ui v4 + Tailwind CSS v4 + Base UI |
| Banco de dados | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | Supabase Auth + `@supabase/ssr` |
| Email | Resend |
| WhatsApp | Evolution API (Baileys) |
| Push | Web Push API + VAPID + `web-push` |
| Storage | Supabase Storage |
| Deploy | Vercel |

---

## 6. Banco de Dados — Tabelas Principais

| Tabela | Descrição |
|---|---|
| `tenants` | Empresas parceiras |
| `users` | Usuários do sistema (todos os roles) |
| `leads` | Contatos e leads (mesma tabela, campo `stage`) |
| `sdr_assignments` | Atribuições SDR com status do kanban |
| `contact_messages` | Timeline de mensagens por canal |
| `lead_assignments` | Distribuições lead → corretor com status do pipeline |
| `lead_activities` | Atividades registradas pelo corretor |
| `broker_preferences` | Preferências de afinidade por corretor |
| `properties` | Imóveis avulsos |
| `developments` | Empreendimentos/lançamentos |
| `tags` | Tags coloridas por tenant |
| `contact_tags` | Relação contato ↔ tag |
| `company_channels` | Configuração de canais por empresa |
| `push_subscriptions` | Subscriptions Web Push por usuário |

---

## 7. URLs de Produção

| Ambiente | URL |
|---|---|
| Produção | https://crm.placego.com.br |
| Homologação | https://placego-crm.vercel.app |
| Evolution API | https://evolution-api-production-d39c.up.railway.app |

---

## 8. Fluxos Principais

### Fluxo 1: Contato via WhatsApp
```
Cliente envia WhatsApp
  → Evolution API dispara webhook /api/evolution/webhook
  → Sistema deduplica (mesmo tenant, últimos 30 dias)
  → Cria contato + salva mensagem
  → Round-robin: atribui ao próximo SDR do tenant
  → Push notification para o SDR
  → SDR vê contato na coluna "Novo" do kanban
```

### Fluxo 2: SDR qualifica e distribui
```
SDR abre conversa → clica "Ver conversa"
  → Lê histórico + responde via WhatsApp/Email
  → Move para "Qualificado" no kanban
  → Acessa /sdr/routing/[contactId]
  → Sistema sugere corretores por score de afinidade
  → SDR seleciona corretor e confirma
  → Corretor recebe: Email + WhatsApp + Push notification
  → Lead aparece na coluna "Novo" do pipeline do corretor
```

### Fluxo 3: Corretor trabalha o lead
```
Corretor recebe notificação
  → Abre pipeline → clica "Entrar em Contato"
  → Move para "Em Contato" + abre página do lead
  → Visualiza histórico de mensagens do SDR
  → Registra atividades (ligação, visita, proposta)
  → Move pelas colunas até "Ganho" ou "Perdido"
  → Se perdido: informa motivo + arquiva
```

### Fluxo 4: Lead via Meta Lead Ads
```
Usuário preenche formulário no Facebook/Instagram
  → Meta dispara webhook /api/leads/capture?token=<token_empresa>
  → Sistema identifica empresa pelo token
  → Deduplicação + score + round-robin
  → Mesmo fluxo do WhatsApp a partir daqui
```

---

## 9. Pendências e Próximas Fases

### QA Pendente
- [ ] Testar fluxo completo WhatsApp → SDR → corretor em produção com novo tenant
- [ ] Validar canais Instagram DM e Facebook DM em produção
- [ ] Testar push no iOS 16.4+ com PWA instalado

### Fase C — Planejado
- Painel duplo SDR (kanban + pipeline lado a lado)
- Melhorias no pipeline (histórico de movimentações, SLA por coluna)
- Relatórios avançados por funil

### Fase D — Planejado
- Integração com portais imobiliários (ZAP, Viva Real, OLX)
- Meta Conversions API
- Publicação do App Meta (verificação de negócio)
- App mobile nativo (React Native)
