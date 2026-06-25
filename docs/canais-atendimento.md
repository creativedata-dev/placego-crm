# PlaceGo CRM — Canais de Atendimento

**Versão:** 1.0 — Junho 2026

---

## Visão geral

O PlaceGo CRM opera como plataforma de atendimento omnichannel. Cada empresa parceira configura seus próprios canais. Um único **app Meta** (PlaceGo CRM — ID: `1689147582125041`) recebe contatos de todas as empresas, identificadas pelo token único.

---

## Canais suportados

| Canal | Fase | Captura | Resposta pelo CRM |
|---|---|---|---|
| WhatsApp | C | Via Evolution API | ✅ |
| Instagram DM | B | Via Meta Webhook | ✅ |
| Facebook Messenger | B | Via Meta Webhook | ✅ |
| Comentários em posts | B | Via Meta Webhook (filtro de palavras) | ✅ |
| Email | B | Via Resend Inbound | ✅ |
| Lead Ads (Meta) | ✅ A | Via Meta Webhook | — |
| Landing Page | ✅ A | Via API | — |
| Cadastro manual | ✅ A | Formulário no CRM | — |
| Portais (Zap, Viva Real) | D | Via Webhook | — |

---

## Configuração por empresa

Acesse: **Menu → Empresas → [Nome da empresa] → Canais**

### WhatsApp (Fase C)

| Campo | Descrição |
|---|---|
| URL da instância Evolution | Ex: `https://evolution.placego.com.br` |
| Nome da instância | Ex: `manaira-prod` |
| API Key | Chave de autenticação da instância |
| Número | Número do WhatsApp da empresa |
| Resposta automática | Mensagem enviada ao primeiro contato |
| Horário de atendimento | Seg–Sex 8h–18h (configurável) |
| Mensagem fora do horário | "Recebemos sua mensagem. Retornaremos em breve." |

### Instagram DM (Fase B)

| Campo | Descrição |
|---|---|
| Page ID | ID da página do Facebook vinculada ao Instagram |
| Access Token | Token de acesso da página (gerado via app Meta) |
| Resposta automática | Mensagem ao primeiro DM |

### Facebook Messenger (Fase B)

| Campo | Descrição |
|---|---|
| Page ID | ID da página do Facebook |
| Access Token | Token de acesso da página |
| Resposta automática | Mensagem ao primeiro contato |

### Comentários em posts/anúncios (Fase B)

| Campo | Descrição |
|---|---|
| Page ID | ID da página monitorada |
| Palavras-chave | Lista separada por vírgula: `interesse, preço, valor, quero, informações` |
| Ação | Criar contato apenas se comentário contiver palavra-chave |
| Resposta automática | Comentário público automático (ex: "Oi! Te mandamos um DM 😊") |

> **Importante:** sem palavras-chave configuradas, nenhum comentário é capturado. Configure pelo menos 3–5 termos relevantes.

### Email (Fase B)

| Campo | Descrição |
|---|---|
| Endereço de entrada | Ex: `leads@manaira.placego.com.br` (subendereço Resend) |
| Resposta automática | Email de confirmação de recebimento |

### Lead Ads Meta (Fase A — ativo)

| Campo | Descrição |
|---|---|
| Token do webhook | Gerado em Empresas → Webhook |
| URL do webhook | `https://crm.placego.com.br/api/leads/capture?token=...` |
| App Meta | PlaceGo CRM (ID: 1689147582125041) |

---

## Resposta automática de boas-vindas

Cada canal pode ter uma mensagem de boas-vindas configurada individualmente. Enviada automaticamente na **primeira interação** de um novo contato.

Exemplos por canal:

**WhatsApp:**
> "Olá! 👋 Recebemos seu contato. Em breve um de nossos consultores entrará em contato com você. Obrigado!"

**Instagram DM:**
> "Olá! Recebemos sua mensagem. Nossa equipe vai entrar em contato em breve 🏠"

**Email:**
> "Obrigado pelo contato! Recebemos sua mensagem e retornaremos em até 1 hora útil."

---

## Horário de atendimento

Configurável por canal. Fora do horário, o sistema:
1. Cria o contato normalmente
2. Envia a mensagem de fora do horário
3. Atribui ao SDR normalmente (SDR responde no próximo horário útil)

---

## Distribuição round-robin

Independente do canal de origem, ao criar um contato o sistema distribui automaticamente para o próximo SDR disponível:

1. Busca SDRs com `role = 'sdr'` ativos
2. Ordena por número de assignments nas últimas 24h (menor primeiro)
3. Em caso de empate, usa `sdr_sequence_order`
4. Cria `sdr_assignments` vinculando contato → SDR

---

## App Meta — Configuração técnica

**App:** PlaceGo CRM  
**ID:** `1689147582125041`  
**Status:** Em desenvolvimento (leads de teste apenas)  
**Publicação:** necessária para leads reais (Fase B)

### Eventos assinados
- `leadgen` ✅ — Lead Ads
- `messages` — DM Instagram/Facebook (Fase B)
- `feed` — Comentários (Fase B)

### Permissões necessárias para Fase B
- `instagram_manage_messages` — responder DMs Instagram
- `pages_messaging` — responder Messenger
- `pages_manage_engagement` — responder comentários
- `pages_read_engagement` — ler comentários

> Permissões avançadas requerem revisão do Meta (processo de aprovação). Iniciar antes da implementação da Fase B.

### Migração de URL (ao mudar de domínio)

Ao mudar de `placego-crm.vercel.app` para `crm.placego.com.br`:

1. CRM → **Empresas → Webhook → Regenerar token** para cada empresa
2. App Meta → **Casos de uso → Personalizar → Webhooks**:
   - Atualizar URL de callback com novo domínio
   - Colar novo token de verificação
   - Clicar em **Verificar e salvar**

---

## Testar integração

### Lead Ads (curl)
```bash
curl -X POST "https://placego-crm.vercel.app/api/leads/capture?token=SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lead Teste",
    "phone": "11999990001",
    "email": "teste@email.com",
    "ad_name": "Campanha Teste",
    "utm_campaign": "teste-integracao"
  }'
```

### Via painel Meta
1. App Meta → **Casos de uso → Personalizar → Ferramentas**
2. Selecionar evento `leadgen`
3. Clicar em **Teste** → **Enviar para servidor**

### Verificar resultado
Acesse **Fila SDR** no CRM — o contato deve aparecer com origem, empresa e campanha identificados.
