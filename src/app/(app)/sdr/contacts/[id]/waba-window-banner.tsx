"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { sendWelcomeTemplateAction } from "./actions";

interface Props {
  contactId: string;
  contactPhone: string | null;
  tenantId: string | null;
  // Data da última mensagem RECEBIDA do contato (direction = "in")
  lastInboundAt: Date | null;
  // Se tenant usa Meta Cloud API
  isMetaCloud: boolean;
}

function getWindowState(lastInboundAt: Date | null): {
  open: boolean;
  remainingMs: number;
} {
  if (!lastInboundAt) return { open: false, remainingMs: 0 };
  const elapsed = Date.now() - new Date(lastInboundAt).getTime();
  const windowMs = 24 * 60 * 60 * 1000;
  const remaining = windowMs - elapsed;
  return { open: remaining > 0, remainingMs: Math.max(0, remaining) };
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function WabaWindowBanner({ contactId, contactPhone, tenantId, lastInboundAt, isMetaCloud }: Props) {
  const [remainingMs, setRemainingMs] = useState(() => getWindowState(lastInboundAt).remainingMs);
  const [windowOpen, setWindowOpen] = useState(() => getWindowState(lastInboundAt).open);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!lastInboundAt || !windowOpen) return;
    const interval = setInterval(() => {
      const state = getWindowState(lastInboundAt);
      setRemainingMs(state.remainingMs);
      setWindowOpen(state.open);
      if (!state.open) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastInboundAt, windowOpen]);

  // Não exibe se não é Meta Cloud
  if (!isMetaCloud) return null;

  function handleSendTemplate() {
    setError(null);
    startTransition(async () => {
      const res = await sendWelcomeTemplateAction(contactId);
      if (res.ok) setSent(true);
      else setError(res.error ?? "Erro ao enviar template");
    });
  }

  if (windowOpen) {
    const urgency = remainingMs < 2 * 60 * 60 * 1000; // < 2h = urgente
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm ${
        urgency
          ? "bg-amber-50 border border-amber-200 text-amber-800"
          : "bg-green-50 border border-green-200 text-green-800"
      }`}>
        <Clock className={`h-4 w-4 shrink-0 ${urgency ? "text-amber-500" : "text-green-500"}`} />
        <div className="flex-1 min-w-0">
          <span className="font-medium">Janela WABA aberta</span>
          <span className="text-muted-foreground mx-1">·</span>
          <span>
            {urgency ? "Atenção! Expira em " : "Expira em "}
            <span className="font-mono font-semibold">{formatRemaining(remainingMs)}</span>
          </span>
        </div>
        <MessageCircle className="h-4 w-4 shrink-0 opacity-60" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800">
        <MessageCircle className="h-4 w-4 shrink-0 text-green-500" />
        <span>Template enviado! Aguarde o contato responder para a janela de 24h abrir.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm bg-zinc-100 border border-zinc-200 text-zinc-700">
      <AlertTriangle className="h-4 w-4 shrink-0 text-zinc-500" />
      <div className="flex-1 min-w-0">
        <span className="font-medium">Janela WABA fechada</span>
        {contactPhone
          ? <span className="text-muted-foreground"> · Envie um template para iniciar a conversa</span>
          : <span className="text-muted-foreground"> · Contato sem telefone cadastrado</span>
        }
        {error && <span className="block text-red-600 text-xs mt-0.5">{error}</span>}
      </div>
      {contactPhone && (
        <button
          type="button"
          onClick={handleSendTemplate}
          disabled={isPending}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Reabrir janela
        </button>
      )}
    </div>
  );
}
