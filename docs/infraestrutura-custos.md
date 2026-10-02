# PlaceGo CRM — Infraestrutura e Custos

**Versão:** 1.1 — Setembro 2026  
**Atualização:** a cada mudança de plano ou novo serviço

> **2026-09-23:** projeto Supabase original (`jebogtuiqnjyyrtzowtr`) foi perdido — estava sob a conta de um colaborador desligado e o domínio parou de resolver (indício de projeto deletado, sem backup disponível). Como nenhum dado era crítico, o banco foi recriado do zero em um projeto novo, sob conta própria. Ver seção 2 atualizada abaixo.

---

## Serviços ativos

### 1. Vercel — Hospedagem e Deploy
**URL:** vercel.com  
**Plano:** Hobby (gratuito) → migrar para Pro quando for para produção real  
**Conta:** creative-data-projects  
**Repositório:** github.com/creativedata-dev/placego-crm  

| Plano | Custo | Limite |
|---|---|---|
| Hobby (atual) | Gratuito | Uso pessoal/teste, sem SLA |
| Pro | ~$20/mês | SLA 99.99%, teams, mais builds |

**Quando migrar para Pro:** ao onboarding do primeiro cliente pagante.

---

### 2. Supabase — Banco de dados, Auth e Storage
**URL:** supabase.com  
**Projeto:** bkkdfobdjnqcastmtrtq (CRM PlaceGo) — recriado em 2026-09-23  
**Organização:** creativedata-dev's Org  
**Região:** South America (São Paulo)  
**Plano:** Free  

| Plano | Custo | Limite |
|---|---|---|
| Free (atual) | Gratuito | 500MB banco, 50MB storage, 50.000 MAU auth |
| Pro | $25/mês | 8GB banco, 100GB storage, MAU ilimitado |

**Quando migrar para Pro:** ao ultrapassar 500MB de banco ou 50k usuários auth.  
**Atenção:** projeto Free pausa após 1 semana sem acesso — monitorar e evitar repetir o incidente de 2026-09-23 (projeto anterior ficou órfão sob conta de ex-colaborador e foi perdido).

**Projeto anterior (perdido):** `jebogtuiqnjyyrtzowtr` — não resolve mais DNS, considerado deletado. Nenhum backup existia; dados recriados do zero.

**Configuração do projeto atual:**
- Connection string: **Transaction Pooler** (porta 6543, host `aws-0-sa-east-1.pooler.supabase.com`) — conexão direta (5432) não funciona em rede IPv4-only.
- Chaves API no formato novo (`sb_publishable_...` / `sb_secret_...`), não mais JWT legado.
- Bucket Storage: `contact-media` (público) — mídias recebidas/enviadas via WhatsApp.
- Schema aplicado via `npx drizzle-kit push` direto no banco vazio (funcionou sem o bug de introspecção/RLS documentado no CLAUDE.md, que só ocorre contra schema pré-existente).
- Usuário admin seed: `admin@placego.com.br` (senha alterada após o primeiro login).

---

### 3. Railway — Evolution API (WhatsApp)
**URL:** railway.app  
**Projeto:** empowering-elegance  
**Serviços:** Evolution API + Redis + PostgreSQL (3 containers)  
**Plano:** Trial ($5 de crédito grátis)  

| Plano | Custo | Limite |
|---|---|---|
| Trial (atual) | Gratuito (até esgotar $5) | $5 de crédito inicial |
| Hobby | $5/mês + uso | ~$10-15/mês estimado com 3 serviços |
| Pro | $20/mês + uso | SLA, mais recursos |

**Estimativa de uso mensal:** ~$10-15/mês (Evolution API ~$5, Redis ~$3, Postgres ~$3)  
**Ação necessária:** adicionar cartão antes de esgotar o crédito trial.

**Configurações:**
- URL: `https://evolution-api-production-d39c.up.railway.app`
- API Key: `placego-evolution-2026`
- Instâncias WhatsApp: uma por empresa (`placego-{slug}`)

---

### 4. Resend — Email transacional e Inbound
**URL:** resend.com  
**Conta:** synapseiqadm  
**Domínio verificado:** placego.com.br (região: São Paulo)  
**Plano:** Free  

| Plano | Custo | Limite |
|---|---|---|
| Free (atual) | Gratuito | 3.000 emails/mês, 100/dia |
| Pro | $20/mês | 50.000 emails/mês |
| Scale | $90/mês | 300.000 emails/mês |

**Uso atual:**
- Email transacional: notificações para corretores ao receber lead
- Email inbound: recebimento via Forwardemail.net (relay → CRM)

**Quando migrar para Pro:** ao ultrapassar 100 emails/dia ou 3.000/mês.

---

### 5. Forwardemail.net — Email Inbound Relay
**URL:** forwardemail.net  
**Plano:** Free (open source)  
**Função:** recebe emails em `*@placego.com.br` e encaminha para o webhook do CRM  

| Plano | Custo |
|---|---|
| Free (atual) | Gratuito |
| Enhanced | $3/mês (criptografia, aliases ilimitados) |

**Configuração DNS no Registro.br:**
```
MX  @  mx1.forwardemail.net  prioridade 10
MX  @  mx2.forwardemail.net  prioridade 20
TXT @  forward-email=inbound@crm.placego.com.br
```

**Endpoint de recebimento:** `https://crm.placego.com.br/api/email/inbound`

---

### 6. Meta (Facebook for Developers) — App de integração
**URL:** developers.facebook.com  
**App:** PlaceGo CRM (ID: 1689147582125041)  
**Conta vinculada:** Manaira Empreendimentos Spe LTDA  
**Custo:** Gratuito  

**Status:** Em desenvolvimento (só recebe webhooks de teste)  
**Para produção:** publicar o app + aprovação de permissões avançadas (DM, comentários)

---

### 7. GitHub — Repositório
**URL:** github.com/creativedata-dev/placego-crm  
**Plano:** Free (repositório privado)  
**Custo:** Gratuito  

---

### 8. Registro.br — Domínio
**Domínio:** placego.com.br  
**DNS:** Registro.br (nameservers padrão)  
**Renovação:** anual (~R$40/ano)  

---

## Resumo de custos mensais

| Serviço | Plano atual | Custo atual | Custo quando escalar |
|---|---|---|---|
| Vercel | Hobby | Gratuito | $20/mês (Pro) |
| Supabase | Free | Gratuito | $25/mês (Pro) |
| Railway (Evolution) | Trial | Gratuito* | ~$15/mês (Hobby) |
| Resend | Free | Gratuito | $20/mês (Pro) |
| Forwardemail | Free | Gratuito | $3/mês (Enhanced) |
| Meta App | Free | Gratuito | Gratuito |
| GitHub | Free | Gratuito | Gratuito |
| Registro.br | Anual | ~R$3,30/mês | ~R$3,30/mês |
| **TOTAL** | | **~R$3,30/mês** | **~$83/mês + R$3,30** |

*Railway Trial esgota em breve — adicionar cartão.

---

## Estimativa por fase de crescimento

### MVP / Homologação (atual)
- **Custo:** ~R$3,30/mês
- **Capacidade:** até ~50 contatos/dia, 5 SDRs, 20 corretores

### Fase de crescimento (1-10 clientes ativos)
- Migrar: Vercel Pro + Supabase Pro + Railway Hobby
- **Custo estimado:** ~$60-65/mês (~R$330-360/mês)
- **Capacidade:** ilimitado na prática

### Escala (10+ clientes, alto volume)
- Adicionar: Redis dedicado, Supabase Scale, Resend Scale
- **Custo estimado:** ~$200-300/mês
- **Considerar:** migrar Evolution para VPS próprio (~$20/mês, mais econômico)

---

## Ações pendentes

- [ ] **Atualizar env vars do Supabase na Vercel** (URL, publishable key, secret key, DATABASE_URL) com os valores do projeto novo `bkkdfobdjnqcastmtrtq` — produção ainda pode estar apontando para o projeto perdido
- [ ] Recriar tenants/empresas reais no banco novo (zerado) e reconectar instâncias Evolution API por tenant
- [ ] Recolar credenciais Meta Cloud API por empresa que já usava esse provider
- [ ] Adicionar cartão no Railway antes de esgotar crédito trial
- [ ] Configurar registros MX/TXT no Registro.br (Forwardemail)
- [ ] Publicar App Meta para receber leads reais (aprovação Meta)
- [ ] Migrar Vercel para Pro ao onboarding primeiro cliente
- [ ] Avaliar migração DNS para Cloudflare (Email Routing gratuito, CDN)
- [ ] Configurar alertas de uso no Supabase e Resend
- [ ] Definir política de acesso a contas de infra: nunca deixar um serviço crítico só na conta pessoal de um colaborador — usar organização/conta compartilhada com múltiplos owners

---

## Credenciais e acesso (resumo)

| Serviço | Acesso | Observação |
|---|---|---|
| Vercel | creative-data-projects | Via GitHub OAuth |
| Supabase | projeto bkkdfobdjnqcastmtrtq | Conta própria (creativedata-dev's Org) — guardar secret key e senha do banco em gerenciador de senhas, nunca só na conta de um único colaborador |
| Railway | empowering-elegance | Adicionar cartão |
| Resend | synapseiqadm | API key no .env |
| Evolution API | placego-evolution-2026 | Nunca expor publicamente |
| Meta App | ID: 1689147582125041 | App em modo desenvolvimento |
| Registro.br | — | Renovar anualmente |

> **Segurança:** todas as chaves sensíveis ficam apenas em `.env.local` (local) e nas variáveis de ambiente da Vercel. Nunca commitar no GitHub.
