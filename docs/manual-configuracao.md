# PlaceGo CRM — Manual de Configuração

**Versão:** 2.0 — Junho 2026  
**Produto:** crm.placego.com.br  
**Equipe:** PlaceGo / JCE Comunicação

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Cadastrar uma Empresa](#2-cadastrar-uma-empresa)
3. [Configurar o webhook Meta por empresa](#3-configurar-o-webhook-meta-por-empresa)
4. [Cadastrar corretores](#4-cadastrar-corretores)
5. [Cadastrar imóveis e empreendimentos](#5-cadastrar-imóveis-e-empreendimentos)
6. [Configurar preferências de afinidade do corretor](#6-configurar-preferências-de-afinidade-do-corretor)
7. [Cadastrar um contato manualmente](#7-cadastrar-um-contato-manualmente)
8. [Fluxo operacional do SDR](#8-fluxo-operacional-do-sdr)
9. [Pipeline do corretor](#9-pipeline-do-corretor)
10. [Painel da Empresa](#10-painel-da-empresa)
11. [Adicionar novos usuários](#11-adicionar-novos-usuários)
12. [Deploy e ambientes](#12-deploy-e-ambientes)
13. [Migração para domínio definitivo](#13-migração-para-domínio-definitivo)
14. [Perguntas frequentes](#14-perguntas-frequentes)

---

## 1. Primeiro acesso

1. Acesse **crm.placego.com.br** (produção) ou **placego-crm.vercel.app** (homologação)
2. Entre com as credenciais de admin:
   - Email: `admin@placego.com.br`
   - Senha: *(definida no setup inicial)*
3. **Troque a senha imediatamente** em Supabase → Authentication → Users → Edit user

> O admin tem acesso total ao sistema. Guarde as credenciais em cofre de senhas.

---

## 2. Cadastrar uma Empresa

Empresas são os parceiros da PlaceGo: imobiliárias, incorporadoras, construtoras e corretores autônomos.

**Caminho:** Menu lateral → **Empresas** → **Nova Empresa**

| Campo | Descrição | Exemplo |
|---|---|---|
| Nome | Nome da empresa | Manaira Empreendimentos |
| Tipo | Categoria do parceiro | Incorporadora |
| Slug | Identificador único na URL (gerado automaticamente) | manaira-empreendimentos |

---

## 3. Configurar o webhook Meta por empresa

Cada empresa tem um Business Manager (BM) diferente no Meta Ads. O PlaceGo CRM usa um **único app Meta** (PlaceGo CRM — App ID: `1689147582125041`) que recebe contatos de todas as empresas. Cada empresa tem um token único que identifica de qual BM o contato veio.

> **Canais capturados:** Lead Ads (formulários), Instagram DM, Facebook Messenger e comentários em posts — todos pelo mesmo app, cada um com evento específico.

### 3.1 Gerar o token no CRM

1. Menu → **Empresas**
2. Clique em **Webhook** na linha da empresa desejada
3. Clique em **Gerar token de webhook**
4. Copie a **URL do Webhook** e o **Token de verificação**

### 3.2 Configurar no Facebook for Developers

1. Acesse o app em [developers.facebook.com/apps/1689147582125041](https://developers.facebook.com/apps/1689147582125041)
2. **Casos de uso → Personalizar → Webhooks**
3. Produto: **Page**
4. Preencha:
   - **URL de callback:** URL copiada do CRM
   - **Verificar token:** token copiado do CRM
5. Clique em **Verificar e salvar**
6. Assine o evento **`leadgen`** (e futuramente `messages`, `feed`)

> **Modo desenvolvimento:** enquanto o app não for publicado, só recebe leads de **teste pelo painel do Meta**. Para leads reais de campanha, o app precisa ser publicado.

### 3.3 Migração de URL (ao trocar de homologação para produção)

Quando o domínio mudar para `crm.placego.com.br`:

1. CRM → **Empresas → Webhook → Regenerar token** para cada empresa
2. App Meta → **Webhooks → Atualizar URL e token → Verificar e salvar**

> O token muda ao regenerar — a URL antiga para de funcionar imediatamente.

### 3.4 Testar via curl

```bash
curl -X POST "https://placego-crm.vercel.app/api/leads/capture?token=SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","phone":"11999990001","email":"teste@email.com","ad_name":"Campanha Teste"}'
```

### 3.5 Regenerar ou revogar token

- **Regenerar:** novo token (anterior para imediatamente). Atualizar no app Meta também.
- **Revogar:** desativa a integração. Novos contatos do Meta são rejeitados.

---

## 4. Cadastrar corretores

**Caminho:** Menu → **Corretores** → **Novo Corretor**

| Campo | Descrição |
|---|---|
| Nome completo | Nome do corretor |
| Email | Email de acesso ao CRM |
| Telefone/WhatsApp | Contato (usado para notificações de leads) |
| CRECI | Registro profissional |
| Perfil | **Corretor Interno** (PlaceGo) ou **Corretor de Empresa** |
| Empresa | Se corretor de empresa, selecione a empresa vinculada |

> Ao cadastrar, o sistema cria o usuário no Supabase Auth automaticamente.

**Após cadastrar:** configure as preferências de afinidade (seção 6).

---

## 5. Cadastrar imóveis e empreendimentos

**Caminho:** Menu → **Imóveis**

### Imóvel avulso
Clique em **Imóvel** e preencha tipo, endereço completo, valor, área, quartos e empresa proprietária.

### Empreendimento (multi-unidade)
Clique em **Empreendimento** e preencha nome, cidade e faixa de valor (mín/máx).

> **Importante:** vincular imóveis à empresa correta garante que leads do Meta sejam associados automaticamente à empresa de origem. Use o campo `external_id` para mapear com o ID do anúncio/imóvel no Meta.

---

## 6. Configurar preferências de afinidade do corretor

As preferências determinam o score de afinidade no Lead Routing.

**Caminho:** Menu → **Corretores** → **Editar**

| Campo | Impacto no score | Dica |
|---|---|---|
| Cidades de atuação | +35 pontos | `São Paulo, Guarulhos` |
| Bairros de atuação | +20 pontos | Quanto mais específico, melhor |
| Valor mínimo | +25 pontos (se no range) | Valor em reais: `500000` |
| Valor máximo | +25 pontos (se no range) | |
| Tipos de imóvel | +20 pontos | Selecionar todos os tipos que atende |

**Score máximo:** 100 pontos | ≥ 60 = Alta afinidade | 1–59 = Parcial | 0 = Sem critérios

---

## 7. Cadastrar um contato manualmente

O admin pode cadastrar contatos que chegaram por qualquer canal fora do sistema (ligação, visita presencial, indicação).

**Caminho:** Menu → **Fila SDR** → **Adicionar contato**

| Campo | Descrição |
|---|---|
| Nome | Nome da pessoa |
| Telefone | WhatsApp ou telefone de contato |
| Email | Email (opcional) |
| Origem | De onde veio: WhatsApp, Instagram, Email, Indicação, Manual... |
| Observações | Contexto do contato, interesse, imóvel mencionado |

> O sistema atribui automaticamente ao próximo SDR via **round-robin**. O SDR recebe o contato no próprio Kanban.

---

## 8. Fluxo operacional do SDR

**Caminho:** Menu → **Fila SDR**

### 8.1 Kanban SDR (individual)

Cada SDR vê apenas seus próprios contatos organizados em 5 colunas:

| Coluna | Significado |
|---|---|
| **Novo** | Contato recém atribuído, ainda não abordado |
| **Em contato** | SDR já iniciou o atendimento |
| **Aguardando** | Aguardando retorno do contato |
| **Qualificado** | Interesse confirmado — vira lead para corretor |
| **Inválido** | Telefone falso, spam, fora do perfil |

### 8.2 Entendendo o score de qualidade

Clique no número do score em qualquer card para ver o detalhamento:

| Critério | Pontos |
|---|---|
| Nome preenchido | +20 |
| Telefone válido | +30 |
| Email informado | +20 |
| Campanha identificada | +15 |
| UTM / anúncio rastreado | +15 |
| **Máximo** | **100** |

Score ≥ 70 = alta chance de conversão.

### 8.3 Filtros disponíveis

- **Por status:** pills clicáveis no topo com contagem por coluna
- **Por origem:** Meta Ads, Instagram, WhatsApp, Manual...
- **Por empresa:** filtrar contatos de uma empresa específica

### 8.4 Ações por contato

| Ação | Quando usar |
|---|---|
| ✅ **Qualificar** | Interesse confirmado — distribui para corretor |
| 🔀 **Distribuir** | Encaminhar para corretor diretamente |
| ⏳ **Aguardando** | Não atendeu — revisar depois |
| ❌ **Invalidar** | Telefone inválido, sem interesse |

### 8.5 Distribuir um lead (routing)

Ao qualificar um contato:

1. O sistema abre a tela de **Distribuição**
2. Corretores são sugeridos por score de afinidade (cidade, valor, tipo de imóvel)
3. SDR seleciona um ou mais corretores
4. Adiciona observação opcional
5. Clique em **Distribuir lead**
6. Corretor recebe notificação por email (e futuramente WhatsApp)

### 8.6 Adicionar contato manualmente

Clique em **Adicionar contato** (canto superior direito) para inserir contatos que chegaram por outros canais.

### 8.7 Visão do gestor

O gestor (`admin_placego`) vê todos os contatos de todos os SDRs com filtros por SDR e por empresa. Acessa via menu → **Fila SDR**.

---

## 9. Pipeline do corretor

**Caminho:** Menu → **Pipeline**

### Colunas do Kanban

| Coluna | Significado |
|---|---|
| **Novo** | Lead recebido, ainda não contatado |
| **Contatado** | Primeiro contato realizado |
| **Visita Agendada** | Visita ao imóvel marcada |
| **Proposta** | Proposta enviada |
| **Ganho** | Negócio fechado ✅ |
| **Perdido** | Negócio não concluído ❌ |

### Mover um lead

**Arrastar e soltar** ou clicar na seta (→) para avançar para a próxima etapa.

> Ao mover para **Perdido**, o motivo é obrigatório.

### Registrar uma atividade

Clique em **+ Atividade** no card:
- 📞 Ligação
- 💬 WhatsApp
- ✉️ Email
- 📍 Visita
- 📝 Anotação

---

## 10. Painel da Empresa

Empresas parceiras acessam o CRM com login de `admin_empresa` ou `corretor_empresa`.

**O que veem:**
- Leads da própria empresa (nunca de outras)
- Status de cada lead no pipeline
- Histórico de atividades dos corretores vinculados
- Métricas básicas: total, qualificados, em atendimento, convertidos

**O que não veem:**
- Contatos ainda na fase de qualificação pelo SDR
- SDRs internos da PlaceGo
- Configurações de roteamento
- Dados financeiros da PlaceGo

---

## 11. Adicionar novos usuários

### SDRs
Inserção direta no banco via Supabase Studio:
1. Authentication → Users → Add user
2. Inserir na tabela `users` com `role = 'sdr'`
3. Definir `sdr_sequence_order` (posição na fila de round-robin: 1, 2, 3...)

### Corretores internos
Menu → **Corretores** → **Novo Corretor** → perfil "Corretor Interno"

### Corretores e admins de empresa
Menu → **Corretores** → **Novo Corretor** → perfil "Corretor de Empresa" + selecionar empresa

### Redefinir senha
Supabase Dashboard → Authentication → Users → Send password reset

---

## 12. Deploy e ambientes

### Ambientes

| Ambiente | URL | Finalidade |
|---|---|---|
| **Homologação** | `https://placego-crm.vercel.app` | Testes e validação |
| **Produção** | `https://crm.placego.com.br` | Uso real |

### Repositório e CI/CD

- **Repositório:** `github.com/creativedata-dev/placego-crm`
- **Branch:** `main` → deploy automático na Vercel
- **App Meta:** PlaceGo CRM (ID: `1689147582125041`)

### Variáveis de ambiente na Vercel

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço |
| `DATABASE_URL` | Connection string Transaction Pooler (porta 6543) |
| `RESEND_API_KEY` | Chave Resend |
| `META_WEBHOOK_VERIFY_TOKEN` | Token global fallback |
| `NEXT_PUBLIC_APP_URL` | URL base do ambiente |

### Configuração Supabase por ambiente

**Homologação:**
- Site URL: `https://placego-crm.vercel.app`
- Redirect URLs: `https://placego-crm.vercel.app/auth/callback`

**Produção:**
- Site URL: `https://crm.placego.com.br`
- Redirect URLs: `https://crm.placego.com.br/auth/callback`

---

## 13. Migração para domínio definitivo

### Checklist completo

- [ ] DNS configurado e propagado
- [ ] Certificado SSL emitido pela Vercel
- [ ] `NEXT_PUBLIC_APP_URL` atualizado → redeploy
- [ ] Supabase Site URL e Redirect URLs atualizados
- [ ] Login funcionando em `crm.placego.com.br`
- [ ] Tokens de webhook regenerados para todas as empresas ativas
- [ ] App Meta atualizado com novas URLs de webhook
- [ ] Email de notificação testado com link correto

### Atenção — tokens de webhook

Ao regenerar tokens (necessário após mudar URL), as integrações Meta param imediatamente. Planeje a migração fora do horário de pico.

---

## 14. Perguntas frequentes

**O contato chegou mas não apareceu na fila do SDR. O que fazer?**
1. Verifique se o webhook está ativo em Empresas → Webhook
2. Confirme URL e token no app Meta
3. Verifique logs em Vercel → Deployments → View Function Logs

**Um contato apareceu mas não foi atribuído a nenhum SDR.**
Verifique se há usuários com `role = 'sdr'` cadastrados no banco. O round-robin só funciona com ao menos um SDR ativo.

**O score está baixo mas o lead parece bom.**
O score mede completude dos dados (nome, telefone, email, campanha, UTM) — não o interesse real. Um lead com score baixo pode ser excelente; o SDR valida isso na qualificação.

**Posso distribuir o mesmo lead para mais de um corretor?**
Sim. Na tela de distribuição, selecione quantos corretores desejar. Cada um gerencia de forma independente no próprio pipeline.

**Como faço para a empresa ver apenas seus próprios leads?**
Os leads são vinculados ao `company_id`. Verifique se os imóveis foram cadastrados com a empresa correta e se o webhook está configurado com o token da empresa certa.

**O SDR que cadastrou o contato fica com ele?**
Não necessariamente. O sistema distribui pelo round-robin independente de quem cadastrou. Apenas o admin pode cadastrar contatos manualmente — e o sistema atribui ao próximo SDR da fila automaticamente.
