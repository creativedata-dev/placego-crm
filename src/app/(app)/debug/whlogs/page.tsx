"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  created_at: string;
  step: string;
  data: Record<string, unknown>;
}

const STEP_LABELS: Record<string, { label: string; color: string }> = {
  "1_received":   { label: "1 · Webhook recebido",         color: "bg-blue-100 text-blue-800 border-blue-200" },
  "2_text":       { label: "2 · Texto extraído",            color: "bg-slate-100 text-slate-700 border-slate-200" },
  "3_phone":      { label: "3 · Phone normalizado",         color: "bg-slate-100 text-slate-700 border-slate-200" },
  "4_broker":     { label: "4 · Busca corretor",            color: "bg-purple-100 text-purple-800 border-purple-200" },
  "5_isPodeSim":  { label: "5 · isPodeSim?",                color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  "6_assignment": { label: "6 · Busca assignment",          color: "bg-orange-100 text-orange-800 border-orange-200" },
  "7_contact":    { label: "7 · Busca contato/lead",        color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  "8_sending":    { label: "8 · Enviando detalhes...",      color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  "9_sent_ok":    { label: "9 · Enviado com sucesso ✓",     color: "bg-green-100 text-green-800 border-green-200" },
  "9_sent_error": { label: "9 · ERRO ao enviar ✗",          color: "bg-red-100 text-red-800 border-red-200" },
};

function stepIcon(step: string) {
  if (step === "9_sent_ok") return <CheckCircle className="h-4 w-4 text-green-600" />;
  if (step === "9_sent_error") return <XCircle className="h-4 w-4 text-red-600" />;
  if (step === "4_broker" ) return null;
  return null;
}

function DataView({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="text-xs bg-black/5 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// Agrupa logs por "sessão" — cada vez que step=1_received aparece, começa nova sessão
function groupBySessions(logs: LogEntry[]): LogEntry[][] {
  const sessions: LogEntry[][] = [];
  let current: LogEntry[] = [];
  for (const log of [...logs].reverse()) {
    if (log.step === "1_received" && current.length > 0) {
      sessions.push(current);
      current = [];
    }
    current.push(log);
  }
  if (current.length > 0) sessions.push(current);
  return sessions.reverse();
}

function statusBadge(session: LogEntry[]) {
  const steps = session.map((s) => s.step);
  if (steps.includes("9_sent_ok")) return <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">SUCESSO</span>;
  if (steps.includes("9_sent_error")) return <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">ERRO</span>;
  const last = steps[steps.length - 1];
  const meta = STEP_LABELS[last];
  return <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${meta?.color ?? "bg-gray-100"}`}>PAROU EM {last}</span>;
}

export default function WhLogsPage() {
  const [sessions, setSessions] = useState<LogEntry[][]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/whlogs");
      const data: LogEntry[] = await res.json();
      setSessions(groupBySessions(data));
      setExpanded(0);
    } finally {
      setLoading(false);
    }
  }

  async function clear() {
    setClearing(true);
    await fetch("/api/debug/whlogs", { method: "DELETE" });
    setSessions([]);
    setClearing(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Debug Webhook WABA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Logs do fluxo "Pode sim!" — cada bloco é uma mensagem recebida
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={clear} disabled={clearing} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Limpar
          </Button>
        </div>
      </div>

      {!loading && sessions.length === 0 && (
        <div className="border rounded-xl p-10 text-center text-muted-foreground text-sm">
          <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>Nenhum log registrado.</p>
          <p className="mt-1 text-xs">Envie "Pode sim!" pelo WhatsApp e clique em Atualizar.</p>
        </div>
      )}

      <div className="space-y-3">
        {sessions.map((session, i) => {
          const first = session[0];
          const isOpen = expanded === i;
          const receivedData = first?.data as any;
          return (
            <div key={i} className="border rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold font-mono">{receivedData?.fromPhone ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{receivedData?.tenantName ?? ""}</span>
                    {statusBadge(session)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(first.created_at).toLocaleString("pt-BR")} · {session.length} steps
                  </p>
                </div>
                <span className="text-muted-foreground text-xs">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t divide-y">
                  {session.map((log, j) => {
                    const meta = STEP_LABELS[log.step] ?? { label: log.step, color: "bg-gray-100 text-gray-700 border-gray-200" };
                    return (
                      <div key={j} className="px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2">
                          {stepIcon(log.step)}
                          <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(log.created_at).toLocaleTimeString("pt-BR")}
                          </span>
                        </div>
                        <DataView data={log.data as Record<string, unknown>} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
