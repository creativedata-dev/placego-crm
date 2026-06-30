# PlaceGo CRM — Integrações de Canais (Inbound)

**Versão:** 1.0 — Junho 2026
**Atualização:** a cada mudança de status ou novo canal implementado

---

## Visão geral

Todo canal de entrada segue o mesmo padrão arquitetural:

```
Mensagem chega no canal externo
        │
        ▼
Webhook recebe o payload
        │
        ▼
lib/contact-ingestion.ts → ingestContactMessage()
        │
        ├── Identifica empresa (tenant) pela credencial configurada
        ├── Deduplica por telefone/email/meta_user_id (30 dias)
        ├── Cria ou atualiza o contato
        ├── Salva a mensagem em contact_messages (timeline)
        └── Round-robin → atribui ao próximo SDR
```

A função `ingestContactMessage()` em [`src/lib/contact-ingestion.ts`](../src/lib/contact-ingestion.ts) é o ponto único de entrada — qualquer canal novo deve usá-la para manter consistência (timeline, deduplicação, round-robin).

---

## Status resumido

| Canal | Status | Endpoint | Credencial necessária |
|---|---|---|---|
| WhatsApp (Evolution API) | ✅ **Em produção** | `/api/evolution/webhook` | Instância Evolution conectada via QR |
| Meta Lead Ads | ✅ **Em produção** | `/api/leads/capture` | Token por empresa (já gerado) |
| Instagram DM | 🟡 **Código pronto, aguardando aprovação Meta** | `/api/meta/webhook` | `page_id` + `access_token` em Conectores |
| Facebook Messenger | 🟡 **Código pronto, aguardando aprovação Meta** | `/api/meta/webhook` | `page_id` + `access_token` em Conectores |
| Comentários (Meta) | 🟡 **Código pronto, aguardando aprovação Meta** | `/api/meta/webhook` | `page_id` + palavras-chave em Conectores |
| Email (Resend webhook) | 🔴 **Abandonado** | `/api/email/inbound` | — (Resend Inbound não oferece webhook push) |
| Email (Forwardemail.net) | 🟡 **Planejado — não iniciado** | `/api/email/inbound` (reaproveita) | MX/TXT no domínio + conta Forwardemail |
| Portais (Zap, Viva Real) | ⚪ **Backlog — Fase D** | A definir | A definir |

---

## 1. WhatsApp — Evolution API

**Status:** ✅ Em produção

### Como funciona
- Cada empresa tem uma instância Evolution própria, nomeada `placego-{slug}`
- Conectada via QR Code em **Empresas → Conectores → WhatsApp**
- Mensagens recebidas disparam o evento `messages.upsert` da Evolution, que envia um webhook para o CRM

### Infraestrutura
- Evolution API hospedada no Railway: `https://evolution-api-production-d39c.up.railway.app`
- Redis + PostgreSQL próprios (containers separados no mesmo projeto Railway)
- API Key: `placego-evolution-2026` (ver `.env.local` → `EVOLUTION_API_KEY`)

### Passo a passo — conectar uma nova empresa
1. Acesse **Empresas → [Empresa] → Conectores**
2. No card **WhatsApp**, clique em **Configurar**
3. Clique em **Conectar WhatsApp**
4. Escaneie o QR Code com o WhatsApp Business da empresa (celular → Configurações → Aparelhos conectados)
5. Aguarde o status mudar para **Conectado**
6. (Opcional) Configure a mensagem de boas-vindas automática

### Webhook
- Endpoint: [`src/app/api/evolution/webhook/route.ts`](../src/app/api/evolution/webhook/route.ts)
- Configurado automaticamente ao criar a instância (`/webhook/set/{instance}` na Evolution API)
- Evento assinado: `MESSAGES_UPSERT`
- Ignora: mensagens enviadas pelo próprio CRM (`fromMe: true`), mensagens de grupo, `protocolMessage`

### Envio (outbound)
- `src/lib/evolution.ts` → `sendText()`
- Usado em: resposta do SDR pelo CRM (`ContactReply`) e notificação ao corretor (`notifyBrokerNewLead`)

### Troubleshooting
- **QR Code não aparece:** verificar se a instância foi criada (`GET /instance/fetchInstances` na Evolution)
- **Mensagens não chegam no CRM:** verificar se o webhook está configurado na instância (`GET /webhook/find/{instance}`)
- **Instância desconectada sozinha:** reconectar gera novo QR Code automaticamente

---

## 2. Meta Lead Ads

**Status:** ✅ Em produção

### Como funciona
- App único PlaceGo CRM no Meta (App ID: `1689147582125041`) atende todas as empresas
- Cada empresa tem um token único gerado em **Empresas → Conectores → Lead Ads**
- O token vai na URL do webhook: `?token=<token_da_empresa>`

### Passo a passo — conectar uma nova empresa
1. Acesse **Empresas → [Empresa] → Conectores → Lead Ads**
2. Copie a **URL do Webhook** e o **Token de verificação**
3. No [Facebook for Developers](https://developers.facebook.com/apps/1689147582125041) → **Casos de uso → Personalizar → Webhooks**
4. Produto: **Page**
5. Cole a URL e o token, clique em **Verificar e salvar**
6. Assine o campo **leadgen**
7. Associe a página de Facebook da empresa ao app

### Webhook
- Endpoint: [`src/app/api/leads/capture/route.ts`](../src/app/api/leads/capture/route.ts)
- Suporta payload nativo do Meta (`entry[].changes[].value.field_data[]`) e payload simplificado
- Round-robin acontece via `assignContactToNextSdr()`

### Limitação atual
- App em **modo desenvolvimento** — só recebe webhooks de teste do painel Meta
- Para leads reais de produção, o app precisa ser **publicado** (ver seção 9)

---

## 3. Instagram DM / Facebook Messenger

**Status:** 🟡 Código pronto, aguardando aprovação Meta

### Como funciona (quando ativo)
- Mesmo endpoint unificado para os dois canais: `/api/meta/webhook`
- Diferencia a plataforma pelo campo `object` do payload (`"instagram"` ou `"page"`)
- Resolve a empresa pelo `page_id` configurado em **Conectores**
- Ignora mensagens "echo" (enviadas pela própria página/CRM)

### Bloqueio atual
Requer aprovação do Meta para as permissões avançadas:
- `instagram_manage_messages`
- `pages_messaging`

Essas permissões exigem **revisão do app** pelo Meta (processo de App Review), que pode levar dias/semanas. Status: aguardando.

### Passo a passo — quando a aprovação sair
1. No app Meta → assinar eventos `messages` no webhook
2. Em **Empresas → Conectores → Instagram Direct / Facebook Messenger**, preencher:
   - **Page ID** da empresa
   - **Access Token** permanente da página
3. Ativar o canal (toggle)
4. Testar enviando uma DM real para a página

### Webhook
- Endpoint: [`src/app/api/meta/webhook/route.ts`](../src/app/api/meta/webhook/route.ts)
- Já implementado e com build passando — só falta a permissão do Meta para receber eventos reais

---

## 4. Comentários (Meta — Facebook/Instagram)

**Status:** 🟡 Código pronto, aguardando aprovação Meta

### Como funciona (quando ativo)
- Mesmo endpoint `/api/meta/webhook`, evento `feed` (campo `field: "feed"`, `item: "comment"`)
- Filtro de **palavras-chave** configurável por empresa — só vira contato se o comentário contiver alguma palavra da lista (evita ruído de comentários genéricos)

### Bloqueio atual
Requer permissão `pages_manage_engagement` — mesma situação do item 3, aguardando App Review do Meta.

### Passo a passo — quando a aprovação sair
1. No app Meta → assinar evento `feed`
2. Em **Empresas → Conectores → Comentários**, preencher:
   - **Page ID**
   - **Palavras-chave de interesse** (ex: `interesse, quero, preço, valor, contato`)
3. Ativar o canal

### Webhook
- Mesmo arquivo do item 3: [`src/app/api/meta/webhook/route.ts`](../src/app/api/meta/webhook/route.ts)

---

## 5. Email

**Status:** 🟡 Planejado — caminho do Resend abandonado, aguardando Forwardemail.net

### Histórico de tentativas

**Tentativa 1 — Resend Inbound (UI)**
- Domínio `placego.com.br` verificado no Resend
- Resend Inbound exige **subdomínio dedicado** + upgrade de plano para usar domínio próprio
- Testado com endereço gratuito `*@tedeeki.resend.app` — emails chegam e aparecem na aba **Receiving**, mas **não há webhook push** disponível na API pública do Resend para esse recurso
- **Conclusão:** abandonado. Resend Inbound hoje só oferece UI de visualização e API de polling (`resend.emails.receive()`), sem push em tempo real

**Tentativa 2 — Resend Automations**
- Testado criar automação disparada por `email.received` com step `webhook`
- API rejeitou: automações do Resend só suportam steps de marketing (`send_email`, `delay`, `condition`, `contact_update`, `add_to_segment`) — não suportam webhook genérico
- **Conclusão:** não é possível usar Automations para este caso

### Caminho planejado — Forwardemail.net

**Por quê:** serviço gratuito, open-source, com suporte real a webhook de recebimento. Não substitui o Resend (que continua para envio transacional) — só resolve o recebimento.

**Decisão de design:** usar um **subdomínio dedicado** (`inbound.placego.com.br`) em vez do domínio raiz, para não conflitar com os registros MX existentes do Resend em `placego.com.br`.

### Passo a passo (a executar)
1. Criar conta gratuita em [forwardemail.net](https://forwardemail.net)
2. Adicionar o domínio `inbound.placego.com.br`
3. No Registro.br, adicionar os registros DNS fornecidos pelo Forwardemail:
   ```
   MX   inbound.placego.com.br   mx1.forwardemail.net   prioridade 10
   MX   inbound.placego.com.br   mx2.forwardemail.net   prioridade 20
   TXT  inbound.placego.com.br   forward-email-site-verification=<código fornecido>
   ```
4. No painel Forwardemail, configurar o webhook de recebimento apontando para:
   ```
   https://crm.placego.com.br/api/email/inbound
   ```
5. Testar enviando um email para `contato@inbound.placego.com.br`
6. Em **Empresas → Conectores → Email**, cadastrar o endereço de recebimento de cada empresa (ex: `manaira@inbound.placego.com.br`)

### Webhook (já implementado, payload a ajustar)
- Endpoint: [`src/app/api/email/inbound/route.ts`](../src/app/api/email/inbound/route.ts)
- Atualmente espera o payload do Resend (`{ type: "email.received", data: {...} }`) — **precisa ser ajustado** para o formato do Forwardemail quando a integração for retomada
- Usa `ingestContactMessage()` — já compatível com a arquitetura, só requer mapear os campos do novo payload

### Status da função compartilhada
- ✅ `ingestContactMessage()` pronta e testada (usada por WhatsApp)
- ✅ Deduplicação por email já implementada
- 🔲 Ajustar parsing do payload Forwardemail (estrutura ainda não mapeada — fazer ao retomar)

---

## 6. Portais imobiliários (Zap, Viva Real)

**Status:** ⚪ Backlog — Fase D, não iniciado

Webhooks de portais costumam seguir formato próprio por integrador. Avaliar:
- Zap Imóveis / OLX: via parceiros de integração (ex: Vista, Imovel Web)
- Viva Real: API própria de leads

Sem cronograma definido — depende de demanda comercial validada primeiro.

---

## 7. Round-robin e timeline — comportamento comum a todos os canais

Toda mensagem recebida por qualquer canal ativo passa pelo mesmo fluxo:

```ts
// src/lib/contact-ingestion.ts
ingestContactMessage({
  name, phone, email, metaUserId,
  origin,        // enum: whatsapp | meta_dm_instagram | meta_dm_facebook | meta_comment | email
  channel,       // enum: whatsapp | instagram_dm | facebook_dm | comment | email
  tenantId,
  qualityScore,
  messageContent,
})
```

- **Deduplicação:** busca contato existente por telefone → email → `meta_user_id`, dentro de 30 dias
- **Se existe:** só adiciona a mensagem na timeline (`contact_messages`), não cria novo contato nem reatribui SDR
- **Se não existe:** cria o contato (`stage: 'contato'`), salva a primeira mensagem, dispara round-robin (`assignContactToNextSdr()`)

### Erro corrigido (Junho 2026)
Inicialmente as mensagens recebidas eram salvas apenas em `leads.notes` (texto solto), não aparecendo na timeline visual do contato. Corrigido para sempre gravar em `contact_messages` — ver commit `12deef7`.

---

## 8. Resolução de empresa (tenant) por canal

| Canal | Como identifica a empresa |
|---|---|
| WhatsApp | Nome da instância Evolution (`placego-{slug}` → busca tenant pelo `slug`) |
| Meta Lead Ads | Token na URL do webhook (`?token=`) |
| Instagram DM / Facebook DM / Comentários | `page_id` do payload comparado com `company_channels.config->page_id` |
| Email (planejado) | Endereço de destino comparado com `company_channels.config->address` |

Todas as credenciais de canal ficam em `company_channels.config` (campo `jsonb`), gerenciadas pela tela **Empresas → Conectores**.

---

## 9. Pendências gerais

- [ ] Publicar App Meta para sair do modo desenvolvimento (necessário para Lead Ads em produção real e para liberar testes de DM/comentários assim que aprovados)
- [ ] Acompanhar status do App Review do Meta (permissões `instagram_manage_messages`, `pages_messaging`, `pages_manage_engagement`)
- [ ] Retomar integração de email via Forwardemail.net (criar conta, configurar DNS, ajustar payload do webhook)
- [ ] Avaliar necessidade de criptografar `company_channels.config` (hoje guarda `access_token` em texto plano no jsonb)
- [ ] Definir escopo de portais imobiliários (Fase D)

---

## Referências de código

| Arquivo | Função |
|---|---|
| `src/lib/contact-ingestion.ts` | Função compartilhada de ingestão (todos os canais) |
| `src/lib/round-robin.ts` | Lógica de distribuição automática para SDRs |
| `src/lib/evolution.ts` | Cliente da Evolution API (WhatsApp) |
| `src/app/api/evolution/webhook/route.ts` | Webhook WhatsApp |
| `src/app/api/leads/capture/route.ts` | Webhook Meta Lead Ads |
| `src/app/api/meta/webhook/route.ts` | Webhook Instagram DM / Facebook DM / Comentários |
| `src/app/api/email/inbound/route.ts` | Webhook Email (payload Resend, a migrar para Forwardemail) |
| `src/app/(app)/tenants/[id]/channels/` | UI de gestão de conectores por empresa |
