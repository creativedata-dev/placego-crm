"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Zap, Clock, MessageSquare, ChevronDown, ChevronUp, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAutomation, updateAutomation, toggleAutomation, deleteAutomation,
  type AutomationPayload, type AutomationTrigger,
} from "@/app/actions/automations";
import type { MessageAutomation } from "@/db/schema";

const TRIGGER_META: Record<AutomationTrigger, { label: string; description: string; icon: string }> = {
  contact_created:    { label: "Novo contato",        description: "Ao receber um novo contato por qualquer canal",    icon: "👤" },
  lead_distributed:   { label: "Lead distribuído",     description: "Quando o SDR distribui o lead para um corretor",   icon: "📤" },
  reopen_conversation:{ label: "Reabrir conversa",     description: "Quando o SDR reabre a janela de 24h manualmente",  icon: "🔄" },
  sla_breach:         { label: "SLA excedido",         description: "Sem ação no contato após o prazo configurado",     icon: "⏰" },
};

const PARAM_VARIABLES: Record<string, string> = {
  "{{nome}}": "Nome do contato",
  "{{telefone}}": "Telefone do contato",
  "{{link_crm}}": "Link do CRM (pipeline/contato)",
  "{{sdr_nome}}": "Nome do SDR responsável",
  "{{corretor_nome}}": "Nome do corretor (lead_distributed)",
};

interface Props {
  tenantId: string;
  tenantName: string;
  automations: MessageAutomation[];
  approvedTemplates: { name: string; params: number }[];
  isMetaCloud: boolean;
}

type MessageType = "template" | "text";

interface FormState {
  id?: string;
  name: string;
  trigger: AutomationTrigger;
  messageType: MessageType;
  templateName: string;
  templateParams: string; // JSON string simples: {"1": "{{nome}}", "2": "{{link_crm}}"}
  messageText: string;
  delayMinutes: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  trigger: "contact_created",
  messageType: "text",
  templateName: "",
  templateParams: "{}",
  messageText: "",
  delayMinutes: 0,
};

function AutomationCard({
  automation,
  tenantId,
  onEdit,
}: {
  automation: MessageAutomation;
  tenantId: string;
  onEdit: (a: MessageAutomation) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isActive = automation.active === "true";
  const trigger = TRIGGER_META[automation.trigger as AutomationTrigger];

  function handleToggle() {
    startTransition(() => toggleAutomation(automation.id, tenantId, !isActive));
  }

  function handleDelete() {
    if (!confirm(`Excluir automação "${automation.name}"?`)) return;
    startTransition(async () => { await deleteAutomation(automation.id, tenantId); });
  }

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all ${isActive ? "border-primary/30 bg-primary/2" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{trigger?.icon ?? "⚡"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{automation.name}</span>
            <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">{trigger?.label}</span>
            {automation.templateName && (
              <span className="text-xs font-mono text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                template: {automation.templateName}
              </span>
            )}
            {automation.messageText && (
              <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">texto livre</span>
            )}
          </div>
          {automation.delayMinutes > 0 && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Delay: {automation.delayMinutes >= 60
                ? `${Math.round(automation.delayMinutes / 60)}h`
                : `${automation.delayMinutes}min`}
            </p>
          )}
          {automation.messageText && (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{automation.messageText}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle ativo */}
          <button onClick={handleToggle} disabled={isPending}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${isActive ? "bg-green-500" : "bg-gray-300"}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <button onClick={() => onEdit(automation)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDelete} disabled={isPending} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AutomationForm({
  tenantId,
  approvedTemplates,
  isMetaCloud,
  initial,
  onClose,
}: {
  tenantId: string;
  approvedTemplates: { name: string; params: number }[];
  isMetaCloud: boolean;
  initial?: MessageAutomation;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return EMPTY_FORM;
    return {
      id: initial.id,
      name: initial.name,
      trigger: initial.trigger as AutomationTrigger,
      messageType: initial.templateName ? "template" : "text",
      templateName: initial.templateName ?? "",
      templateParams: initial.templateParams ? JSON.stringify(initial.templateParams, null, 2) : "{}",
      messageText: initial.messageText ?? "",
      delayMinutes: initial.delayMinutes,
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set(key: keyof FormState, value: any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim()) return setError("Nome obrigatório.");
    if (form.messageType === "template" && !form.templateName) return setError("Selecione um template.");
    if (form.messageType === "text" && !form.messageText.trim()) return setError("Mensagem obrigatória.");

    let templateParams: Record<string, string> | undefined;
    if (form.messageType === "template") {
      try { templateParams = JSON.parse(form.templateParams); }
      catch { return setError("Parâmetros do template inválidos (JSON)."); }
    }

    const payload: AutomationPayload = {
      name: form.name,
      trigger: form.trigger,
      templateName: form.messageType === "template" ? form.templateName : undefined,
      templateParams,
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

  const selectedTemplate = approvedTemplates.find((t) => t.name === form.templateName);

  return (
    <div className="border rounded-xl p-5 space-y-5 bg-muted/20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{form.id ? "Editar automação" : "Nova automação"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <Label className="text-xs">Nome *</Label>
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Boas-vindas novo contato" className="h-9 text-sm" />
      </div>

      {/* Trigger */}
      <div className="space-y-1.5">
        <Label className="text-xs">Gatilho *</Label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(TRIGGER_META) as [AutomationTrigger, typeof TRIGGER_META[AutomationTrigger]][]).map(([key, meta]) => (
            <button key={key} type="button" onClick={() => set("trigger", key)}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-colors ${form.trigger === key ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}>
              <span className="text-lg">{meta.icon}</span>
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
        <Label className="text-xs">Mensagem *</Label>
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
      </div>

      {/* Template */}
      {form.messageType === "template" && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Template aprovado</Label>
            <select value={form.templateName} onChange={(e) => set("templateName", e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="">Selecione...</option>
              {approvedTemplates.map((t) => (
                <option key={t.name} value={t.name}>{t.name} ({t.params} param{t.params !== 1 ? "s" : ""})</option>
              ))}
            </select>
          </div>
          {selectedTemplate && selectedTemplate.params > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Mapeamento de parâmetros (JSON)</Label>
              <textarea value={form.templateParams} onChange={(e) => set("templateParams", e.target.value)} rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono resize-none" />
              <div className="flex flex-wrap gap-1">
                {Object.entries(PARAM_VARIABLES).map(([v, label]) => (
                  <button key={v} type="button"
                    onClick={() => {
                      // Insere variável no campo de params
                      const idx = Object.keys(JSON.parse(form.templateParams || "{}")).length + 1;
                      try {
                        const parsed = JSON.parse(form.templateParams || "{}");
                        parsed[String(idx)] = v;
                        set("templateParams", JSON.stringify(parsed, null, 2));
                      } catch { /* ignora */ }
                    }}
                    className="text-xs bg-muted border rounded px-1.5 py-0.5 hover:bg-muted/80 font-mono">
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Ex: {`{"1": "{{nome}}", "2": "{{link_crm}}"}`}</p>
            </div>
          )}
        </div>
      )}

      {/* Texto livre */}
      {form.messageType === "text" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Mensagem</Label>
          <textarea value={form.messageText} onChange={(e) => set("messageText", e.target.value)} rows={4}
            placeholder="Olá {{nome}}, recebemos sua mensagem..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" />
          <div className="flex flex-wrap gap-1">
            {Object.entries(PARAM_VARIABLES).map(([v, label]) => (
              <button key={v} type="button"
                onClick={() => set("messageText", form.messageText + v)}
                className="text-xs bg-muted border rounded px-1.5 py-0.5 hover:bg-muted/80 font-mono"
                title={label}>
                {v}
              </button>
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
          <input type="number" value={form.delayMinutes} onChange={(e) => set("delayMinutes", Number(e.target.value))}
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

export function AutomationsManager({ tenantId, tenantName, automations, approvedTemplates, isMetaCloud }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MessageAutomation | null>(null);

  function handleEdit(a: MessageAutomation) {
    setEditing(a);
    setShowForm(false);
  }

  function handleClose() {
    setShowForm(false);
    setEditing(null);
  }

  const activeCount = automations.filter((a) => a.active === "true").length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-sm text-muted-foreground">Empresa</p>
        <h1 className="text-2xl font-bold">{tenantName}</h1>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Automações de mensagens</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Envios automáticos disparados por eventos. {activeCount} ativa{activeCount !== 1 ? "s" : ""} de {automations.length}.
          </p>
        </div>
        {!showForm && !editing && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Nova automação
          </Button>
        )}
      </div>

      {/* Formulário de criação */}
      {showForm && !editing && (
        <AutomationForm
          tenantId={tenantId}
          approvedTemplates={approvedTemplates}
          isMetaCloud={isMetaCloud}
          onClose={handleClose}
        />
      )}

      {/* Lista */}
      <div className="space-y-3">
        {automations.length === 0 && !showForm && (
          <div className="border rounded-xl p-10 text-center text-muted-foreground text-sm">
            <Zap className="h-8 w-8 mx-auto mb-3 opacity-20" />
            <p>Nenhuma automação configurada.</p>
            <p className="mt-1 text-xs">Crie automações para enviar mensagens automaticamente em eventos do CRM.</p>
          </div>
        )}

        {automations.map((a) => (
          <div key={a.id}>
            {editing?.id === a.id ? (
              <AutomationForm
                tenantId={tenantId}
                approvedTemplates={approvedTemplates}
                isMetaCloud={isMetaCloud}
                initial={a}
                onClose={handleClose}
              />
            ) : (
              <AutomationCard automation={a} tenantId={tenantId} onEdit={handleEdit} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
