# PlaceGo CRM — Manual de Configuração

**Versão:** 1.0 — Junho 2026  
**Produto:** crm.placego.com.br  
**Equipe:** PlaceGo / JCE Comunicação

---

## Índice

1. [Primeiro acesso](#1-primeiro-acesso)
2. [Cadastrar um Tenant](#2-cadastrar-um-tenant)
3. [Configurar o webhook Meta por tenant](#3-configurar-o-webhook-meta-por-tenant)
4. [Cadastrar corretores](#4-cadastrar-corretores)
5. [Cadastrar imóveis e empreendimentos](#5-cadastrar-imóveis-e-empreendimentos)
6. [Configurar preferências de afinidade do corretor](#6-configurar-preferências-de-afinidade-do-corretor)
7. [Fluxo operacional do SDR](#7-fluxo-operacional-do-sdr)
8. [Pipeline do corretor](#8-pipeline-do-corretor)
9. [Painel do Tenant](#9-painel-do-tenant)
10. [Adicionar novos usuários](#10-adicionar-novos-usuários)
11. [Deploy e ambientes](#11-deploy-e-ambientes)
12. [Migração para domínio definitivo](#12-migração-para-domínio-definitivo)
13. [Perguntas frequentes](#13-perguntas-frequentes)

---

## 1. Primeiro acesso

1. Acesse **crm.placego.com.br**
2. Entre com as credenciais de admin:
   - Email: `admin@placego.com.br`
   - Senha: *(definida no setup inicial)*
3. **Troque a senha imediatamente** em Supabase → Authentication → Users → Edit user

> O admin tem acesso total ao sistema. Guarde as credenciais em cofre de senhas (Bitwarden, 1Password etc.).

---

## 2. Cadastrar um Tenant

Tenants são os parceiros da PlaceGo: imobiliárias, incorporadoras, construtoras e corretores autônomos.

**Caminho:** Menu lateral → **Tenants** → **Novo Tenant**

| Campo | Descrição | Exemplo |
|---|---|---|
| Nome | Nome da empresa ou pessoa | Imóveis Lisboa |
| Tipo | Categoria do parceiro | Imobiliária |
| Slug | Identificador único na URL (gerado automaticamente) | imoveis-lisboa |

> O slug é usado na URL do painel do tenant: `/tenant/imoveis-lisboa`. Pode ser editado antes de salvar, mas evite mudar após o tenant já estar em uso.

---

## 3. Configurar o webhook Meta por tenant

Cada tenant tem um Business Manager (BM) diferente no Meta Ads. Para que os leads do Meta cheguem automaticamente ao CRM, é preciso configurar o webhook em cada BM.

### 3.1 Gerar o token no CRM

1. Menu → **Tenants**
2. Clique em **Webhook** na linha do tenant desejado
3. Clique em **Gerar token de webhook**
4. Copie a **URL do Webhook** e o **Token de verificação** (botões de cópia ao lado de cada campo)

### 3.2 Configurar no Meta Business Manager

1. Acesse [business.facebook.com](https://business.facebook.com) com a conta do tenant
2. Vá em **Configurações do negócio** → **Integrações** → **Webhooks**
3. Clique em **Adicionar** → selecione o objeto **Lead**
4. Preencha os campos:
   - **URL do Callback:** cole a URL copiada do CRM
   - **Token de verificação:** cole o token copiado do CRM
5. Clique em **Verificar e salvar**
6. Na lista de campos, marque **leadgen** e salve
7. Associe o webhook à(s) página(s) de Facebook do tenant

### 3.3 Testar a integração

No Meta Business Manager, use a ferramenta **Teste de webhook** para enviar um lead fictício. Após alguns segundos, o lead deve aparecer na **Fila SDR** do CRM.

### 3.4 Regenerar ou revogar token

- **Regenerar:** gera um novo token (o anterior para de funcionar). É necessário atualizar o token no BM do tenant.
- **Revogar:** desativa a integração completamente. Novos leads do Meta serão rejeitados até que um novo token seja gerado.

---

## 4. Cadastrar corretores

**Caminho:** Menu → **Corretores** → **Novo Corretor**

| Campo | Descrição |
|---|---|
| Nome completo | Nome do corretor |
| Email | Email de acesso ao CRM (será o login) |
| Telefone/WhatsApp | Contato do corretor |
| CRECI | Registro profissional |
| Perfil | **Corretor Interno** (PlaceGo) ou **Corretor de Tenant** |
| Tenant | Se for corretor de tenant, selecione o tenant vinculado |

> Ao cadastrar, o sistema cria o usuário no Supabase Auth automaticamente. Uma senha temporária é gerada — use a função **Reset de senha** do Supabase para enviar o email de redefinição ao corretor.

### Após cadastrar: configurar preferências de afinidade

Sem preferências, o sistema não consegue sugerir corretores no Lead Routing. Configure logo após o cadastro (ver seção 6).

---

## 5. Cadastrar imóveis e empreendimentos

**Caminho:** Menu → **Imóveis**

### Imóvel avulso
Clique em **Imóvel** (botão azul) e preencha:
- Tenant proprietário, tipo, endereço completo, valor, área e quartos

### Empreendimento (multi-unidade)
Clique em **Empreendimento** e preencha:
- Nome do empreendimento, cidade, faixa de valor (mín/máx)

> **Importante:** vincular imóveis ao tenant correto é fundamental para que os leads do Meta sejam associados corretamente ao empreendimento de origem. Use o campo `external_id` para mapear com o ID do anúncio/imóvel no Meta.

---

## 6. Configurar preferências de afinidade do corretor

As preferências determinam o score de afinidade no Lead Routing (quanto maior o score, mais o sistema sugere aquele corretor para determinado lead).

**Caminho:** Menu → **Corretores** → **Editar** (ícone de lápis)

| Campo | Impacto no score | Dica |
|---|---|---|
| Cidades de atuação | +35 pontos | Separar por vírgula: `São Paulo, Guarulhos` |
| Bairros de atuação | +20 pontos | Quanto mais específico, melhor a sugestão |
| Valor mínimo | +25 pontos (se no range) | Valor em reais sem formatação: `500000` |
| Valor máximo | +25 pontos (se no range) | |
| Tipos de imóvel | +20 pontos | Selecionar todos os tipos que o corretor atende |

**Score máximo possível:** 100 pontos  
- ≥ 60 pts → Alta afinidade (aparece primeiro na tela de routing)  
- 1–59 pts → Afinidade parcial  
- 0 pts → Sem critérios cadastrados

---

## 7. Fluxo operacional do SDR

**Caminho:** Menu → **Fila SDR**

A fila mostra todos os leads com status **Novo** e **Aguardando**, ordenados por data de chegada (mais antigos primeiro). Cada card exibe score de qualidade, origem e tempo decorrido.

### 7.1 Filtros disponíveis

- **Por status:** Novos / Aguardando / Qualificados / Inválidos / Duplicados
- **Por origem:** Meta Ads / Landing Page / Manual / Portal

### 7.2 Ações por lead

| Ação | Quando usar |
|---|---|
| ✅ **Qualificar** (botão verde) | Lead válido e com interesse confirmado |
| 🔀 **Distribuir** (botão de seta) | Enviar para corretores sem qualificar antes |
| ⏳ **Aguardando** | Precisou ligar e não atendeu — revisar depois |
| 🔁 **Duplicado** | Mesmo contato já está na fila |
| ❌ **Invalidar** | Telefone inválido, spam, sem interesse real |

> **Boa prática:** sempre qualifique antes de distribuir. Um lead qualificado sinaliza ao corretor que o SDR confirmou o interesse.

### 7.3 Adicionar lead manual

Clique em **Adicionar lead** (canto superior direito) para inserir leads que chegaram por outros canais (indicação, ligação direta, WhatsApp da empresa).

### 7.4 Distribuir (Lead Routing)

Ao clicar no ícone de distribuição (🔀):

1. Revise o **card do lead** com todas as informações
2. Veja os corretores sugeridos agrupados por afinidade
3. Selecione **um ou mais corretores** (clique para marcar/desmarcar)
4. Adicione uma observação opcional para os corretores
5. Clique em **Distribuir lead**

O lead é automaticamente marcado como **Qualificado** ao distribuir. Cada corretor selecionado recebe uma cópia vinculada ao lead original.

---

## 8. Pipeline do corretor

**Caminho:** Menu → **Pipeline** (ou **Meu Pipeline** para corretores)

O pipeline é um quadro Kanban com 6 colunas:

| Coluna | Significado |
|---|---|
| **Novo** | Lead recém recebido, ainda não contatado |
| **Contatado** | Primeiro contato realizado |
| **Visita Agendada** | Visita ao imóvel marcada |
| **Proposta** | Proposta de compra/locação enviada |
| **Ganho** | Negócio fechado |
| **Perdido** | Negócio não concluído |

### Mover um lead

**Arrastar e soltar** o card para outra coluna — ou clicar na seta (→) no card para avançar para a próxima etapa.

> Ao mover para **Perdido**, um campo obrigatório de motivo é exibido. Preencha com detalhes — esses dados alimentam os relatórios de perda.

### Registrar uma atividade

Clique em **+ Atividade** no card para registrar:
- 📞 Ligação
- 💬 WhatsApp
- ✉️ Email
- 📍 Visita
- 📝 Anotação

Opcionalmente, ao registrar a atividade você pode mover o lead para outra etapa ao mesmo tempo.

---

## 9. Painel do Tenant

Os tenants acessam o CRM pela mesma URL (`crm.placego.com.br`) com seu próprio login de `admin_tenant` ou `corretor_tenant`.

### O que o tenant vê:
- Seus próprios leads (nunca de outros tenants)
- Status de cada lead no pipeline
- Histórico de atividades dos corretores vinculados
- Métricas básicas do painel

### O que o tenant **não** vê:
- Leads de outros tenants
- SDRs internos da PlaceGo
- Configurações de roteamento
- Dados financeiros da PlaceGo

---

## 10. Adicionar novos usuários

Todos os usuários são criados pelo **Admin PlaceGo** ou via `npm run db:seed` (apenas para o admin inicial).

### Para SDRs e corretores internos (PlaceGo):
1. Menu → **Corretores** → **Novo Corretor**
2. Selecione perfil **Corretor Interno** ou peça ao dev para inserir diretamente no banco com role `sdr`

### Para admins de tenant:
Inserção direta no banco via Supabase Studio:
1. Crie o usuário em **Authentication → Users**
2. Insira na tabela `users` com `role = 'admin_tenant'` e `tenant_id` correto

### Redefinir senha de um usuário:
Supabase Dashboard → **Authentication → Users** → selecione o usuário → **Send password reset**

---

## 11. Perguntas frequentes

**O lead chegou no Meta mas não apareceu na fila SDR. O que fazer?**
1. Verifique se o webhook está ativo em Tenants → Webhook do tenant
2. Confirme que a URL e o token estão corretos no BM do Meta
3. Verifique os logs em Supabase → Edge Functions ou nos logs da Vercel

**Um lead apareceu como "Duplicado". Isso é problema?**
Não necessariamente. O sistema marcou automaticamente porque o mesmo telefone ou email já entrou nos últimos 30 dias. O SDR pode revisar e qualificar manualmente se achar que é uma nova oportunidade real.

**O corretor não aparece com score alto mesmo atuando na mesma cidade.**
Verifique se as preferências do corretor foram preenchidas em **Corretores → Editar**. O nome da cidade deve ser idêntico ao cadastrado no imóvel (maiúsculas/minúsculas e acentos são ignorados, mas a grafia precisa coincidir: `São Paulo` ≠ `Sao Paulo`).

**Posso distribuir o mesmo lead para mais de um corretor?**
Sim. Na tela de distribuição, selecione quantos corretores desejar. Cada um recebe uma cópia independente do lead e gerencia no próprio pipeline.

**Como faço para o tenant ver apenas os leads dos imóveis dele?**
Os leads são vinculados ao imóvel de origem (`source_property_id`). Certifique-se de que os imóveis foram cadastrados com o `tenant_id` correto e que o `external_id` do imóvel corresponde ao ID do anúncio no Meta.

---

## 11. Deploy e ambientes

### Ambientes

| Ambiente | URL | Finalidade |
|---|---|---|
| **Homologação** | `https://placego-crm.vercel.app` | Testes, validação de funcionalidades, integração com Meta |
| **Produção** | `https://crm.placego.com.br` | Uso real — a migrar após homologação |

### Repositório e CI/CD

- **Repositório:** `github.com/creativedata-dev/placego-crm`
- **Branch principal:** `main`
- Todo push para `main` dispara deploy automático na Vercel
- Preview deployments automáticos para Pull Requests

### Variáveis de ambiente na Vercel

Configure em **Vercel → Project → Settings → Environment Variables**:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (nunca expor no frontend) |
| `DATABASE_URL` | Connection string Transaction Pooler (porta 6543) |
| `RESEND_API_KEY` | Chave da API Resend para emails |
| `META_WEBHOOK_VERIFY_TOKEN` | Token global de fallback para webhook Meta |
| `NEXT_PUBLIC_APP_URL` | URL base do ambiente (`https://placego-crm.vercel.app` em homologação) |

### Configuração do Supabase por ambiente

Em **Supabase → Authentication → URL Configuration**, configure conforme o ambiente ativo:

**Homologação:**
- Site URL: `https://placego-crm.vercel.app`
- Redirect URLs: `https://placego-crm.vercel.app/auth/callback`

**Produção (após migração):**
- Site URL: `https://crm.placego.com.br`
- Redirect URLs: `https://crm.placego.com.br/auth/callback`

> Mantenha **ambas** as URLs em Redirect URLs durante a transição para não interromper sessões ativas.

---

## 12. Migração para domínio definitivo

Quando a homologação estiver concluída, siga esta sequência para migrar para `crm.placego.com.br`:

### Passo 1 — Configurar domínio na Vercel
1. Acesse **Vercel → Project → Settings → Domains**
2. Adicione `crm.placego.com.br`
3. Configure o DNS conforme instruído pela Vercel (registro CNAME ou A apontando para os servidores deles)
4. Aguarde a propagação DNS e emissão do certificado SSL (geralmente < 10 minutos)

### Passo 2 — Atualizar variável de ambiente
1. Em **Vercel → Environment Variables**, altere:
   - `NEXT_PUBLIC_APP_URL` → `https://crm.placego.com.br`
2. Faça um novo deploy (Vercel → Deployments → Redeploy)

### Passo 3 — Atualizar Supabase
1. Acesse **Supabase → Authentication → URL Configuration**
2. Atualize **Site URL** para `https://crm.placego.com.br`
3. Em **Redirect URLs**, adicione `https://crm.placego.com.br/auth/callback`
   - Mantenha também `https://placego-crm.vercel.app/auth/callback` por segurança durante a transição

### Passo 4 — Regenerar tokens de webhook dos tenants

> ⚠️ **Atenção:** os tokens de webhook existentes continuam funcionando, mas a URL base muda. Os tokens gerados durante a homologação apontavam para `placego-crm.vercel.app`. Após a migração, a URL gerada nos novos tokens já usará `crm.placego.com.br` automaticamente.

Para cada tenant com webhook ativo:
1. Menu → **Tenants → Webhook** do tenant
2. Clique em **Regenerar token**
3. Copie a nova URL e atualize no Business Manager do Meta

### Passo 5 — Validar
- Acesse `https://crm.placego.com.br` e confirme o login
- Teste o recebimento de um lead via webhook com a nova URL
- Confirme que os emails de notificação chegam com o link correto

### Checklist de migração

- [ ] DNS configurado e propagado
- [ ] Certificado SSL emitido pela Vercel
- [ ] `NEXT_PUBLIC_APP_URL` atualizado e redeploy feito
- [ ] Supabase Site URL e Redirect URLs atualizados
- [ ] Login funcionando em `crm.placego.com.br`
- [ ] Tokens de webhook regenerados para todos os tenants ativos
- [ ] Meta BM atualizado com novas URLs de webhook
- [ ] Email de notificação testado com link correto

---

## 13. Perguntas frequentes
