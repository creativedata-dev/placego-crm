"use client";

import { useState, useTransition } from "react";
import {
  Plus, Pencil, Trash2, Zap, Clock, MessageSquare, X, Loader2,
  ShieldOff, UserCheck, ToggleLeft, ChevronRight, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAutomation, updateAutomation, toggleAutomation, deleteAutomation,
  type AutomationPayload, type AutomationTrigger,
} from "@/app/actions/automations";
import { saveWelcomeConfig, saveOptoutKeywords, addOptout, removeOptout } from "@/app/actions/optout";
import type { MessageAutomation, ContactOptout } from "@/db/schema";

// ── Constantes ─────────────────────────────────────────────────────────────────

const TRIGGER_META: Record<AutomationTrigger, { label: string; description: string; icon: string }> = {
  contact_created:     { label: "Novo contato",      description: "Ao receber um novo contato por qualquer canal",   icon: "👤" },
  lead_distributed:    { label: "Lead distribuído",   description: "Quando o SDR distribui o lead para um corretor", icon: "📤" },
  reopen_conversation: { label: "Reabrir conversa",   description: "Quando reabre a janela de 24h manualmente",      icon: "🔄" },
  sla_breach:          { label: "SLA excedido",       description: "Sem ação no contato após o prazo configurado",   icon: "⏰" },
};

const CRM_VARS: { v: string; label: string }[] = [
  { v: "{{nome}}",          label: "Nome do contato" },
  { v: "{{telefone}}",      label: "Telefone" },
  { v: "{{link_crm}}",      label: "Link CRM" },
  { v: "{{sdr_nome}}",      label: "Nome do SDR" },
  { v: "{{corretor_nome}}", label: "Nome do corretor" },
];

// Templates hardcoded do sistema (disparados automaticamente pelo código)
const SYSTEM_TEMPLATES = [
  {
    key: "welcome",
    icon: "👋",
    label: "Boas-vindas",
    trigger: "Primeira mensagem recebida via WhatsApp",
    description: "Texto livre enviado imediatamente após o contato escrever pela primeira vez. Janela de 24h já está aberta — não precisa de template WABA.",
    configurable: true,
  },
  {
    key: "lead_distribution",
    icon: "📤",
    label: "Detalhes do lead para corretor",
    trigger: "SDR distribui lead para corretor",
    description: "Envia via WhatsApp do sistema os dados do contato (nome, telefone, email, link CRM) para o corretor que recebeu o lead.",
    configurable: false,
    note: "Disparado automaticamente via Evolution API ou Meta Cloud conforme provedor configurado.",
  },
  {
    key: "reopen",
    icon: "🔄",
    label: "Reabrir conversa",
    trigger: 'Corretor clica "Reabrir conversa" no pipeline',
    description: 'Envia o template WABA iniciar_conversa para reabrir a janela de 24h com o contato.',
    configurable: false,
    note: 'Requer template "iniciar_conversa" aprovado na sua WABA.',
  },
];

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  tenantId: string;
  tenantName: string;
  automations: MessageAutomation[];
  approvedTemplates: { name: string; params: number; bodyText: string }[];
  isMetaCloud: boolean;
  autoWelcome: boolean;
  welcomeMessage: string;
  optoutKeywords: string[];
  optouts: ContactOptout[];
}

type MessageType = "template" | "text";

interface FormState {
  id?: string;
  name: string;
  trigger: AutomationTrigger;
  messageType: MessageType;
  templateName: string;
  // mapa posicional: {"1": "{{nome}}", "2": "{{link_crm}}"}
  templateParamMap: Record<string, string>;
  messageText: string;
  delayMinutes: number;
}

const EMPTY_FORM: FormState = {
  name: "", trigger: "contact_created", messageType: "text",
  templateName: "", templateParamMap: {}, messageText: "", delayMinutes: 0,
};

// ── Seção 1 — Templates do sistema ────────────────────────────────────────────

function SystemTemplatesSection({
  tenantId, autoWelcome, welcomeMessage, isMetaCloud,
}: { tenantId: string; autoWelcome: boolean; welcomeMessage: string; isMetaCloud: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [localAutoWelcome, setLocalAutoWelcome] = useState(autoWelcome);
  const [localMsg, setLocalMsg] = useState(welcomeMessage);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      await saveWelcomeConfig(tenantId, { autoWelcome: localAutoWelcome, welcomeMessage: localMsg });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Templates do sistema</h2>
      <p className="text-sm text-muted-foreground">
        Disparos automáticos gerenciados pelo CRM. Não precisam de configuração manual — acontecem nos eventos abaixo.
      </p>

      <div className="space-y-3">
        {SYSTEM_TEMPLATES.map((t) => (
          <div key={t.key} className="border rounded-xl overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <span className="text-xl mt-0.5 shrink-0">{t.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                    {t.trigger}
                  </span>
                  {t.key === "welcome" && isMetaCloud && (
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${localAutoWelcome ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {localAutoWelcome ? "Ativo" : "Inativo"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                {t.note && (
                  <p className="text-xs text-blue-600 mt-1 flex items-start gap-1">
                    <Info className="h-3 w-3 shrink-0 mt-0.5" />{t.note}
                  </p>
                )}
              </div>
            </div>

            {/* Config inline de boas-vindas */}
            {t.key === "welcome" && isMetaCloud && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Enviar boas-vindas automaticamente</Label>
                  <button
                    type="button"
                    onClick={() => setLocalAutoWelcome((v) => !v)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${localAutoWelcome ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${localAutoWelcome ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>

                {localAutoWelcome && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mensagem de boas-vindas</Label>
                    <textarea
                      value={localMsg}
                      onChange={(e) => setLocalMsg(e.target.value)}
                      rows={3}
                      placeholder="Olá! 👋 Recebemos sua mensagem e em breve um especialista vai entrar em contato."
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                    <div className="flex flex-wrap gap-1">
                      {CRM_VARS.slice(0, 2).map(({ v, label }) => (
                        <button key={v} type="button"
                          onClick={() => setLocalMsg((m) => m + v)}
                          className="text-xs bg-muted border rounded px-1.5 py-0.5 hover:bg-muted/80 font-mono"
                          title={label}>{v}</button>
                      ))}
                    </div>
                  </div>
                )}

                <Button size="sm" onClick={handleSave} disabled={isPending}>
                  {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                  {saved ? "Salvo ✓" : "Salvar"}
                </Button>
              </div>
            )}

            {t.key === "welcome" && !isMetaCloud && (
              <div className="border-t px-4 py-2 bg-muted/10">
                <p className="text-xs text-muted-foreground">
                  Disponível apenas para empresas com WhatsApp Meta Cloud API configurado.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Seção 2 — Automações personalizadas ───────────────────────────────────────

function AutomationCard({
  automation, tenantId, onEdit,
}: { automation: MessageAutomation; tenantId: string; onEdit: (a: MessageAutomation) => void }) {
  const [isPending, startTransition] = useTransition();
  const isActive = automation.active === "true";
  const trigger = TRIGGER_META[automation.trigger as AutomationTrigger];

  return (
    <div className={`border rounded-xl p-4 space-y-2 transition-all ${isActive ? "border-primary/30 bg-primary/2" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{trigger?.icon ?? "⚡"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{automation.name}</span>
            <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">{trigger?.label}</span>
            {automation.templateName && (
              <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                {automation.templateName}
              </span>
            )}
            {automation.delayMinutes > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {automation.delayMinutes >= 60
                  ? `${Math.round(automation.delayMinutes / 60)}h`
                  : `${automation.delayMinutes}min`}
              </span>
            )}
          </div>
          {automation.messageText && (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{automation.messageText}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => startTransition(() => toggleAutomation(automation.id, tenantId, !isActive))}
            disabled={isPending}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <button onClick={() => onEdit(automation)} className="text-muted-foreground hover:text-foreground p-1">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (!confirm(`Excluir "${automation.name}"?`)) return;
              startTransition(async () => { await deleteAutomation(automation.id, tenantId); });
            }}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive p-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AutomationForm({
  tenantId, approvedTemplates, isMetaCloud, initial, onClose,
}: {
  tenantId: string;
  approvedTemplates: { name: string; params: number; bodyText: string }[];
  isMetaCloud: boolean;
  initial?: MessageAutomation;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return EMPTY_FORM;
    const rawParams = initial.templateParams as Record<string, string> | null;
    return {
      id: initial.id,
      name: initial.name,
      trigger: initial.trigger as AutomationTrigger,
      messageType: initial.templateName ? "template" : "text",
      templateName: initial.templateName ?? "",
      templateParamMap: rawParams ?? {},
      messageText: initial.messageText ?? "",
      delayMinutes: initial.delayMinutes,
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const selectedTemplate = approvedTemplates.find((t) => t.name === form.templateName);

  // Extrai lista de {{N}} do body do template selecionado
  const templateSlots: { index: string; preview: string }[] = [];
  if (selectedTemplate?.bodyText) {
    const matches = [...selectedTemplate.bodyText.matchAll(/\{\{(\d+)\}\}/g)];
    for (const m of matches) {
      templateSlots.push({ index: m[1], preview: m[0] });
    }
  }

  function handleSubmit() {
    if (!form.name.trim()) return setError("Nome obrigatório.");
    if (form.messageType === "template" && !form.templateName) return setError("Selecione um template.");
    if (form.messageType === "text" && !form.messageText.trim()) return setError("Mensagem obrigatória.");

    const payload: AutomationPayload = {
      name: form.name,
      trigger: form.trigger,
      templateName: form.messageType === "template" ? form.templateName : undefined,
      templateParams: form.messageType === "template" ? form.templateParamMap : undefined,
      messageText: form.messageType === "text" ? form.messageText : undefined,
      delayMinutes: form.delayMinutes,
    };

    setError(null);
    startTransition(async () => {
      const res = form.id
        ? await updateAutomation(form.id, tenantId, payload)
        : await createAutomation(tenantId, payload);
      if (res.ok) onClose();
      else setError(res.message);
    });
  }

  return (
    <div className="border rounded-xl p-5 space-y-5 bg-muted/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{form.id ? "Editar automação" : "Nova automação"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <Label className="text-xs">Nome *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)}
          placeholder="Ex: Follow-up novo contato" className="h-9 text-sm" />
      </div>

      {/* Trigger */}
      <div className="space-y-1.5">
        <Label className="text-xs">Gatilho *</Label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(TRIGGER_META) as [AutomationTrigger, typeof TRIGGER_META[AutomationTrigger]][]).map(([key, meta]) => (
            <button key={key} type="button" onClick={() => set("trigger", key)}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${form.trigger === key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
              <span className="text-lg shrink-0">{meta.icon}</span>
              <div>
                <p className="text-sm font-medium">{meta.label}</p>
                <p className="text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de mensagem */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de mensagem *</Label>
        <div className="flex gap-2">
          <button type="button" onClick={() => set("messageType", "text")}
            className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${form.messageType === "text" ? "border-primary bg-primary/5" : "border-border"}`}>
            <MessageSquare className="h-4 w-4 inline mr-1.5" />Texto livre
          </button>
          {isMetaCloud && approvedTemplates.length > 0 && (
            <button type="button" onClick={() => set("messageType", "template")}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${form.messageType === "template" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Zap className="h-4 w-4 inline mr-1.5" />Template WABA
            </button>
          )}
        </div>
        {form.messageType === "text" && (
          <p className="text-xs text-amber-600 flex items-start gap-1">
            <Info className="h-3 w-3 shrink-0 mt-0.5" />
            Texto livre só pode ser enviado dentro da janela de 24h após o contato escrever.
            Para contatos frios, use Template WABA.
          </p>
        )}
      </div>

      {/* Template WABA */}
      {form.messageType === "template" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Template aprovado</Label>
            <select value={form.templateName} onChange={(e) => { set("templateName", e.target.value); set("templateParamMap", {}); }}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Selecione...</option>
              {approvedTemplates.map((t) => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground text-xs">
              {selectedTemplate.bodyText}
            </div>
          )}

          {templateSlots.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Parâmetros do template</Label>
              {templateSlots.map(({ index, preview }) => (
                <div key={index} className="space-y-1">
                  <p className="text-xs text-muted-foreground font-mono">{preview} — parâmetro {index}</p>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={form.templateParamMap[index] ?? ""}
                      onChange={(e) => set("templateParamMap", { ...form.templateParamMap, [index]: e.target.value })}
                      placeholder={`Valor para ${preview}`}
                      className="h-8 text-sm flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {CRM_VARS.map(({ v, label }) => (
                      <button key={v} type="button"
                        onClick={() => set("templateParamMap", { ...form.templateParamMap, [index]: v })}
                        className="text-xs bg-muted border rounded px-1.5 py-0.5 hover:bg-muted/80 font-mono"
                        title={label}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Texto livre */}
      {form.messageType === "text" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem *</Label>
          <textarea value={form.messageText} onChange={(e) => set("messageText", e.target.value)} rows={4}
            placeholder="Olá {{nome}}, sua solicitação foi recebida..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
          <div className="flex flex-wrap gap-1">
            {CRM_VARS.map(({ v, label }) => (
              <button key={v} type="button"
                onClick={() => set("messageText", form.messageText + v)}
                className="text-xs bg-muted border rounded px-1.5 py-0.5 hover:bg-muted/80 font-mono"
                title={label}>{v}</button>
            ))}
          </div>
        </div>
      )}

      {/* Delay */}
      <div className="space-y-1.5">
        <Label className="text-xs">Delay antes de enviar</Label>
        <div className="flex gap-2 flex-wrap">
          {[0, 5, 15, 30, 60, 120, 1440].map((m) => (
            <button key={m} type="button" onClick={() => set("delayMinutes", m)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.delayMinutes === m ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}>
              {m === 0 ? "Imediato" : m < 60 ? `${m}min` : m === 60 ? "1h" : m === 120 ? "2h" : "24h"}
            </button>
          ))}
          <input type="number" min={0} value={form.delayMinutes}
            onChange={(e) => set("delayMinutes", Number(e.target.value))}
            className="w-20 h-8 rounded-lg border border-input bg-background px-2 text-xs" placeholder="min" />
        </div>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {form.id ? "Salvar alterações" : "Criar automação"}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Seção 3 — Opt-out ─────────────────────────────────────────────────────────

const DEFAULT_KEYWORDS = ["PARAR", "STOP", "CANCELAR", "SAIR", "NAO QUERO", "NÃO QUERO"];

function OptoutSection({
  tenantId, initialKeywords, initialOptouts,
}: { tenantId: string; initialKeywords: string[]; initialOptouts: ContactOptout[] }) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function addKeyword() {
    const k = newKeyword.trim().toUpperCase();
    if (k && !keywords.includes(k)) setKeywords((prev) => [...prev, k]);
    setNewKeyword("");
  }

  function removeKeyword(k: string) {
    setKeywords((prev) => prev.filter((x) => x !== k));
  }

  function saveKeywords() {
    startTransition(async () => {
      await saveOptoutKeywords(tenantId, keywords);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleAddPhone() {
    const phone = newPhone.trim();
    if (!phone) return;
    startTransition(async () => {
      await addOptout(tenantId, phone, newReason.trim() || undefined);
      setNewPhone("");
      setNewReason("");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Opt-out</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Contatos que solicitaram não receber mensagens. Exigido pela política da Meta e pela LGPD.
        </p>
      </div>

      {/* Opt-in info */}
      <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3">
        <UserCheck className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
        <div className="text-xs text-green-800 space-y-0.5">
          <p className="font-semibold">Opt-in automático</p>
          <p>Toda primeira mensagem recebida via WhatsApp é registrada como opt-in — o contato iniciou a conversa voluntariamente. Isso atende a política da Meta e serve como evidência de consentimento para a LGPD.</p>
        </div>
      </div>

      {/* Keywords */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Palavras-chave de opt-out</Label>
        <p className="text-xs text-muted-foreground">
          Ao receber qualquer dessas palavras, o contato é registrado como opt-out e não recebe mais mensagens automáticas.
        </p>
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="flex items-center gap-1 text-xs bg-red-50 border border-red-200 text-red-700 rounded-full px-2.5 py-1 font-mono">
              {k}
              <button type="button" onClick={() => removeKeyword(k)}
                className="hover:text-red-900 ml-0.5"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="Nova palavra-chave..." className="h-8 text-sm flex-1" />
          <Button size="sm" variant="outline" onClick={addKeyword}>Adicionar</Button>
          <Button size="sm" onClick={saveKeywords} disabled={isPending}>
            {saved ? "Salvo ✓" : "Salvar"}
          </Button>
        </div>
        <button type="button" onClick={() => setKeywords(DEFAULT_KEYWORDS)}
          className="text-xs text-muted-foreground hover:text-foreground underline">
          Restaurar padrões
        </button>
      </div>

      {/* Lista de opt-outs */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold">Números bloqueados ({initialOptouts.length})</Label>

        {/* Adicionar manualmente */}
        <div className="flex gap-2">
          <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Telefone (ex: 11999887766)" className="h-8 text-sm flex-1" />
          <Input value={newReason} onChange={(e) => setNewReason(e.target.value)}
            placeholder="Motivo (opcional)" className="h-8 text-sm flex-1" />
          <Button size="sm" variant="outline" onClick={handleAddPhone} disabled={isPending}>
            <ShieldOff className="h-3.5 w-3.5 mr-1.5" />Bloquear
          </Button>
        </div>

        {initialOptouts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center border rounded-xl">Nenhum número em opt-out.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            {initialOptouts.map((o, i) => (
              <div key={o.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${i > 0 ? "border-t" : ""}`}>
                <span className="font-mono text-sm flex-1">{o.phone}</span>
                <span className="text-xs text-muted-foreground capitalize">{o.source}</span>
                {o.reason && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{o.reason}</span>}
                <span className="text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <button
                  onClick={() => startTransition(async () => { await removeOptout(o.id, tenantId); })}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  title="Remover opt-out (reativar)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Tab = "system" | "automations" | "optout";

export function AutomationsManager({
  tenantId, tenantName, automations, approvedTemplates, isMetaCloud,
  autoWelcome, welcomeMessage, optoutKeywords, optouts,
}: Props) {
  const [tab, setTab] = useState<Tab>("system");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MessageAutomation | null>(null);

  const activeCount = automations.filter((a) => a.active === "true").length;

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "system",      label: "Templates do sistema" },
    { key: "automations", label: "Automações",    badge: activeCount || undefined },
    { key: "optout",      label: "Opt-out",       badge: optouts.length || undefined },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground">Empresa</p>
        <h1 className="text-2xl font-bold">{tenantName}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => { setTab(t.key); setShowForm(false); setEditing(null); }}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
            {t.badge !== undefined && (
              <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Templates do sistema */}
      {tab === "system" && (
        <SystemTemplatesSection
          tenantId={tenantId}
          autoWelcome={autoWelcome}
          welcomeMessage={welcomeMessage}
          isMetaCloud={isMetaCloud}
        />
      )}

      {/* Tab: Automações personalizadas */}
      {tab === "automations" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Automações personalizadas</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Envios automáticos configuráveis por evento. {activeCount} ativa{activeCount !== 1 ? "s" : ""} de {automations.length}.
              </p>
            </div>
            {!showForm && !editing && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1.5" />Nova
              </Button>
            )}
          </div>

          {showForm && !editing && (
            <AutomationForm tenantId={tenantId} approvedTemplates={approvedTemplates}
              isMetaCloud={isMetaCloud} onClose={() => setShowForm(false)} />
          )}

          <div className="space-y-3">
            {automations.length === 0 && !showForm && (
              <div className="border rounded-xl p-10 text-center text-muted-foreground text-sm">
                <Zap className="h-8 w-8 mx-auto mb-3 opacity-20" />
                <p>Nenhuma automação configurada.</p>
              </div>
            )}
            {automations.map((a) => (
              <div key={a.id}>
                {editing?.id === a.id ? (
                  <AutomationForm tenantId={tenantId} approvedTemplates={approvedTemplates}
                    isMetaCloud={isMetaCloud} initial={a} onClose={() => setEditing(null)} />
                ) : (
                  <AutomationCard automation={a} tenantId={tenantId} onEdit={setEditing} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Opt-out */}
      {tab === "optout" && (
        <OptoutSection
          tenantId={tenantId}
          initialKeywords={optoutKeywords}
          initialOptouts={optouts}
        />
      )}
    </div>
  );
}
