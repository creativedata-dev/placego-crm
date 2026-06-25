# PlaceGo CRM — Referência do Webhook de Leads

**Endpoint base:** `https://crm.placego.com.br/api/leads/capture`

---

## Autenticação

Todos os requests devem incluir o token do tenant na query string:

```
?token=<webhook_token_do_tenant>
```

O token é gerado no CRM em **Tenants → Webhook → Gerar token**.

Requests sem token ou com token inválido retornam `401 Unauthorized`.

---

## GET — Verificação do webhook (Meta)

O Meta chama este endpoint para verificar se a URL é válida antes de ativar o webhook.

```
GET /api/leads/capture?token=<token>&hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
```

**Parâmetros enviados pelo Meta:**

| Parâmetro | Valor esperado |
|---|---|
| `hub.mode` | `subscribe` |
| `hub.verify_token` | mesmo valor do campo **Token de verificação** no CRM |
| `hub.challenge` | string aleatória gerada pelo Meta |

**Resposta de sucesso:** `200 OK` com o valor de `hub.challenge` no body (texto puro).

**Resposta de erro:** `403 Forbidden` se o token não corresponder.

> No Meta Business Manager, use o mesmo token nos campos **URL do Callback** (com `?token=`) e **Token de verificação**.

---

## POST — Receber lead

```
POST /api/leads/capture?token=<token>
Content-Type: application/json
```

### Payload Meta Lead Ads (formato nativo)

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "leadgen_id": "1234567890",
            "page_id": "111222333",
            "ad_id": "444555666",
            "campaign_id": "777888999",
            "field_data": [
              { "name": "full_name", "values": ["João da Silva"] },
              { "name": "phone_number", "values": ["+5511999999999"] },
              { "name": "email", "values": ["joao@email.com"] }
            ]
          },
          "field": "leadgen"
        }
      ]
    }
  ]
}
```

### Payload simplificado (integração direta / testes)

```json
{
  "name": "João da Silva",
  "phone": "11999999999",
  "email": "joao@email.com",
  "campaign_id": "777888999",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "lancamento-residencial-abc",
  "property_id": "EXT-001"
}
```

### Campos suportados

| Campo (Meta `field_data`) | Campo direto | Tipo | Descrição |
|---|---|---|---|
| `full_name` ou `nome` | `name` | string | Nome do lead |
| `phone_number`, `telefone`, `whatsapp` | `phone` | string | **Obrigatório.** Leads sem telefone são descartados |
| `email` | `email` | string | Email do lead |
| — | `campaign_id` ou `ad_id` | string | ID da campanha/anúncio |
| — | `utm_source` | string | UTM source |
| — | `utm_medium` | string | UTM medium |
| — | `utm_campaign` | string | UTM campaign |
| — | `property_id` | string | `external_id` do imóvel no CRM para vinculação automática |

### Resposta de sucesso

```json
{ "ok": true }
```

**Status:** `200 OK`

### Respostas de erro

| Status | Motivo |
|---|---|
| `400 Bad Request` | Request GET sem parâmetros obrigatórios |
| `401 Unauthorized` | Token ausente ou inválido |
| `500 Internal Server Error` | Erro ao processar o lead |

---

## Lógica de processamento

### Deduplicação

Um lead é marcado como `duplicate` (em vez de `new`) se já existir no banco, nas últimas **30 dias**, com o mesmo:
- telefone, **ou**
- email

O lead duplicado é inserido normalmente (para auditoria), mas o SDR pode ver e qualificar manualmente se julgar necessário.

### Score de qualidade

O `quality_score` (0–100) é calculado no momento da inserção:

| Critério | Pontos |
|---|---|
| Nome preenchido (≠ "Sem nome") | +20 |
| Telefone presente | +30 |
| Email presente | +20 |
| `campaign_id` presente | +15 |
| `utm_source` presente | +15 |
| **Máximo** | **100** |

---

## Testar localmente com curl

```bash
# Verificação (GET)
curl "http://localhost:3000/api/leads/capture?token=SEU_TOKEN&hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=test123"
# Resposta esperada: test123

# Enviar lead de teste (POST)
curl -X POST "http://localhost:3000/api/leads/capture?token=SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lead Teste",
    "phone": "11999990000",
    "email": "teste@email.com",
    "utm_campaign": "teste-webhook"
  }'
# Resposta esperada: {"ok":true}
```

---

## Expor localhost para testes com o Meta

O Meta precisa de uma URL pública para chamar o webhook. Em desenvolvimento, use **ngrok** ou **localtunnel**:

```bash
# Instalar ngrok: https://ngrok.com
ngrok http 3000

# A URL gerada (ex: https://abc123.ngrok.io) pode ser usada temporariamente no BM do Meta
# URL completa: https://abc123.ngrok.io/api/leads/capture?token=SEU_TOKEN
```

> Use ngrok apenas para testes. Em produção, o webhook aponta para `crm.placego.com.br`.

---

## Vinculação de lead ao imóvel

Para que o lead seja automaticamente vinculado ao imóvel de origem (e o sistema calcule afinidade de roteamento), o imóvel precisa estar cadastrado com o campo `external_id` correspondente ao ID do anúncio no Meta.

**No CRM:** ao cadastrar o imóvel em **Imóveis → Novo Imóvel**, use o campo `external_id` para inserir o ID do produto/imóvel conforme configurado no Catálogo do Meta.

**No webhook:** envie `property_id` com o mesmo valor.

Exemplo:
- Imóvel no CRM: `external_id = "META-PROD-789"`
- Webhook: `"property_id": "META-PROD-789"`
- Resultado: `lead.source_property_id` = UUID do imóvel no banco
