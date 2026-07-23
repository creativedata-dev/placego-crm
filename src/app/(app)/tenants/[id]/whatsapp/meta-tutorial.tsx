"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle, AlertCircle, Info } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Criar conta no Meta Business Manager",
    time: "5 min",
    items: [
      {
        text: 'Acesse business.facebook.com e clique em "Criar conta"',
        link: "https://business.facebook.com",
        linkLabel: "business.facebook.com",
      },
      {
        text: "Preencha o nome da empresa, seu nome e email comercial",
      },
      {
        text: "Confirme o email — você receberá um link de verificação",
        warning: "Use um email da empresa, não pessoal. Ele será o administrador principal.",
      },
      {
        text: "Na primeira tela, ignore a sugestão de criar anúncios — vá direto em Configurações",
      },
    ],
  },
  {
    number: "02",
    title: "Criar um App no Meta for Developers",
    time: "10 min",
    items: [
      {
        text: "Acesse developers.facebook.com → clique em \"Meus apps\" → \"Criar app\"",
        link: "https://developers.facebook.com/apps",
        linkLabel: "developers.facebook.com/apps",
      },
      {
        text: 'Escolha o tipo: "Business" → clique em Próximo',
      },
      {
        text: "Preencha o nome do app (ex: PlaceGo CRM) e selecione a conta do Business Manager criada no passo 01",
      },
      {
        text: 'Na tela de produtos, localize "WhatsApp" e clique em "Configurar"',
      },
      {
        text: 'Selecione sua conta do Business Manager quando solicitado — clique em "Continuar"',
        tip: "Isso vincula o app à sua empresa e libera a API.",
      },
    ],
  },
  {
    number: "03",
    title: "Adicionar e verificar o número de telefone",
    time: "15 min",
    items: [
      {
        text: 'Dentro do app, vá em WhatsApp → "Configuração da API"',
      },
      {
        text: 'Em "Números de telefone", clique em "Adicionar número de telefone"',
        warning: "O número NÃO pode estar registrado no WhatsApp App ou WhatsApp Business App. Se estiver, você precisa deletar a conta antes.",
      },
      {
        text: "Preencha: nome de exibição da empresa, categoria (ex: Imóveis), e o número com DDD e DDI (+55)",
      },
      {
        text: "Escolha a verificação por SMS ou ligação — insira o código recebido",
        tip: "Chips virtuais (Vivo, Claro virtual) funcionam. Evite VOIP — pode não receber o código.",
      },
      {
        text: "Após verificar, o número aparece na lista com status \"Conectado\"",
      },
    ],
  },
  {
    number: "04",
    title: "Copiar o Phone Number ID",
    time: "2 min",
    items: [
      {
        text: 'Ainda em WhatsApp → "Configuração da API", localize a seção "Enviar e receber mensagens"',
      },
      {
        text: "No campo \"De\", selecione o número que você acabou de verificar",
      },
      {
        text: 'Abaixo aparece o campo "ID do número de telefone" — copie esse valor (são ~15 dígitos)',
        tip: "Exemplo: 123456789012345 — este é o valor que vai no campo Phone Number ID do PlaceGo CRM.",
      },
    ],
  },
  {
    number: "05",
    title: "Criar um System User e gerar o Access Token permanente",
    time: "10 min",
    items: [
      {
        text: 'Volte ao Business Manager (business.facebook.com) → menu lateral → "Usuários do sistema"',
        link: "https://business.facebook.com/settings/system-users",
        linkLabel: "Abrir Usuários do sistema",
        warning: "Não use o token temporário da tela de API Setup — ele expira em 24h e quebrará o CRM.",
      },
      {
        text: 'Clique em "Adicionar" → dê um nome (ex: PlaceGo CRM Bot) → perfil: "Administrador" → Criar usuário do sistema',
      },
      {
        text: 'Com o usuário criado, clique em "Gerar novo token"',
      },
      {
        text: "Selecione o App criado no passo 02",
      },
      {
        text: 'Marque as permissões: whatsapp_business_messaging e whatsapp_business_management → clique em "Gerar token"',
        tip: "Marque \"Token nunca expira\" se disponível — caso contrário, anote a data e renove antes do vencimento.",
      },
      {
        text: "Copie o token gerado (começa com EAA...) — ele não será exibido novamente",
        warning: "Salve o token em local seguro imediatamente. Ao fechar a janela, ele some.",
      },
    ],
  },
  {
    number: "06",
    title: "Conceder acesso ao App para o System User",
    time: "5 min",
    items: [
      {
        text: 'Ainda nos Usuários do sistema, selecione o usuário criado → clique em "Conceder acesso a recursos"',
      },
      {
        text: 'Selecione "Apps" → escolha o app do passo 02 → marque todas as permissões → Salvar',
      },
      {
        text: 'Depois vá em "Apps" no menu lateral → selecione o seu app → Adicionar pessoas → adicione o System User como administrador',
      },
    ],
  },
  {
    number: "07",
    title: "Configurar no PlaceGo CRM",
    time: "2 min",
    items: [
      {
        text: 'Nesta página, selecione "Meta Cloud API" no seletor de provedor acima',
      },
      {
        text: 'Cole o Phone Number ID (passo 04) no campo correspondente',
      },
      {
        text: 'Cole o Access Token (passo 05) no campo correspondente',
      },
      {
        text: 'Clique em "Salvar configuração" — o sistema valida as credenciais automaticamente',
      },
      {
        text: "Pronto! Os corretores desta empresa passarão a receber notificações de novos leads pela API oficial do Meta",
      },
    ],
  },
];

const LIMITS = [
  { label: "Tier 1 (padrão)", value: "1.000 conversas/dia", color: "text-amber-600" },
  { label: "Tier 2", value: "10.000 conversas/dia", color: "text-blue-600" },
  { label: "Tier 3", value: "100.000 conversas/dia", color: "text-green-600" },
  { label: "Ilimitado", value: "Após verificação da empresa", color: "text-emerald-700" },
];

export function MetaTutorial() {
  const [open, setOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div>
            <p className="font-semibold text-sm">Tutorial: como configurar a Meta Cloud API</p>
            <p className="text-xs text-muted-foreground">Passo a passo para cadastrar um número novo no Business Manager</p>
          </div>
        </div>
        {open
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="border-t px-5 py-5 space-y-5">

          {/* Aviso inicial */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Antes de começar</p>
              <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-400">
                <li>• O número não pode estar ativo no WhatsApp App ou Business App — precisa ser deletado primeiro</li>
                <li>• Você vai precisar de acesso ao telefone para receber o código de verificação por SMS ou ligação</li>
                <li>• Tempo total estimado: ~45 minutos na primeira vez</li>
              </ul>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <span className="text-xs font-black text-muted-foreground/60 w-6 shrink-0">{step.number}</span>
                  <span className="flex-1 text-sm font-medium">{step.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">~{step.time}</span>
                  {expandedStep === i
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </button>

                {expandedStep === i && (
                  <div className="border-t px-4 py-4 space-y-3 bg-muted/10">
                    {step.items.map((item, j) => (
                      <div key={j} className="flex gap-3">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="space-y-1.5 min-w-0">
                          <p className="text-sm">{item.text}</p>
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {item.linkLabel}
                            </a>
                          )}
                          {item.tip && (
                            <div className="flex items-start gap-1.5 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-md px-2.5 py-1.5">
                              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{item.tip}</span>
                            </div>
                          )}
                          {item.warning && (
                            <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-md px-2.5 py-1.5">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>{item.warning}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Limites de envio */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold">Limites de envio da Meta Cloud API</p>
            <p className="text-xs text-muted-foreground">Os limites sobem automaticamente conforme o uso — sem necessidade de solicitação manual.</p>
            <div className="grid grid-cols-2 gap-2">
              {LIMITS.map((l) => (
                <div key={l.label} className="border rounded-lg p-2.5 text-xs">
                  <p className="font-medium text-muted-foreground">{l.label}</p>
                  <p className={`font-bold mt-0.5 ${l.color}`}>{l.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Para notificações de corretores (uso do CRM), o Tier 1 (1.000/dia) é suficiente para a grande maioria dos cenários.</span>
            </div>
          </div>

          {/* FAQ */}
          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold">Dúvidas frequentes</p>
            <div className="space-y-3 text-xs">
              {[
                {
                  q: "Posso usar o número atual do WhatsApp Business?",
                  a: "Não diretamente. Você precisa primeiro remover a conta do WhatsApp Business App: Configurações → Conta → Excluir minha conta. Só então o número fica disponível para a API oficial.",
                },
                {
                  q: "O número precisa ter chip físico?",
                  a: "Não. Chips virtuais (e-SIM, Vivo Easy Virtual, etc.) funcionam para receber o SMS de verificação. Após verificado, o chip não precisa mais estar ativo — o número fica na nuvem do Meta.",
                },
                {
                  q: "Quanto custa?",
                  a: "A Meta cobra por conversa (janela de 24h). As primeiras 1.000 conversas de negócio por mês são gratuitas. Acima disso, o preço varia por país (Brasil: aprox. USD 0,075–0,125/conversa).",
                },
                {
                  q: "O token expira?",
                  a: "Tokens de System User podem ser gerados sem expiração. Tokens de usuário comum expiram em 60 dias. Use sempre System User Token para integrações de produção.",
                },
                {
                  q: "O que acontece se o token for revogado?",
                  a: "As notificações param de ser enviadas silenciosamente (o CRM registra o erro nos logs). Basta gerar um novo token e atualizar nesta página.",
                },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="font-medium">❓ {item.q}</p>
                  <p className="text-muted-foreground pl-4">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
