"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, Loader2, CheckCircle, XCircle, PauseCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[];
}

interface Template {
  id: string;
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED";
  category: string;
  language: string;
  components: TemplateComponent[];
}

const STATUS_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  APPROVED: { label: "Aprovado",  icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  PENDING:  { label: "Pendente",  icon: <Clock className="h-3.5 w-3.5" />,       color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  REJECTED: { label: "Rejeitado", icon: <XCircle className="h-3.5 w-3.5" />,     color: "text-red-700 bg-red-50 border-red-200" },
  PAUSED:   { label: "Pausado",   icon: <PauseCircle className="h-3.5 w-3.5" />, color: "text-zinc-600 bg-zinc-50 border-zinc-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};

function TemplatePreview({ components }: { components: TemplateComponent[] }) {
  const header = components.find((c) => c.type === "HEADER");
  const body = components.find((c) => c.type === "BODY");
  const footer = components.find((c) => c.type === "FOOTER");
  const buttons = components.find((c) => c.type === "BUTTONS");

  return (
    <div className="mt-3 bg-[#e5ddd5] rounded-xl p-3 max-w-xs">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden text-sm">
        {header && (
          <div className="bg-zinc-100 px-3 py-2 border-b">
            <p className="font-semibold text-xs text-zinc-500 uppercase tracking-wide">{header.format === "IMAGE" ? "📷 Imagem" : header.text ?? ""}</p>
          </div>
        )}
        {body && <p className="px-3 py-2 text-[13px] text-zinc-800 whitespace-pre-wrap leading-snug">{body.text}</p>}
        {footer && <p className="px-3 pb-2 text-[11px] text-zinc-400">{footer.text}</p>}
        {buttons && buttons.buttons && (
          <div className="border-t divide-y">
            {buttons.buttons.map((btn, i) => (
              <div key={i} className="px-3 py-1.5 text-center text-[13px] text-blue-600 font-medium">
                {btn.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function WabaTemplatesPanel({ tenantId }: { tenantId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/waba/templates?tenantId=${tenantId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao consultar");
      setTemplates(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tenantId]);

  const filtered = filter === "ALL" ? templates : templates.filter((t) => t.status === filter);
  const counts = templates.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {["ALL", "APPROVED", "PENDING", "REJECTED", "PAUSED"].map((s) => (
            <button key={s} type="button" onClick={() => setFilter(s)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border text-muted-foreground"}`}>
              {s === "ALL" ? `Todos (${templates.length})` : `${STATUS_META[s]?.label} (${counts[s] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            Gerenciar no Meta <ExternalLink className="h-3 w-3" />
          </a>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Atualizar
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando Meta Graph API...
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum template encontrado.</p>
      )}

      <div className="space-y-2">
        {filtered.map((t) => {
          const meta = STATUS_META[t.status];
          const isOpen = expanded === t.id;
          return (
            <div key={t.id} className="border rounded-xl overflow-hidden">
              <button type="button" onClick={() => setExpanded(isOpen ? null : t.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 text-left transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold font-mono">{t.name}</span>
                    <span className={`flex items-center gap-1 text-xs font-semibold border px-2 py-0.5 rounded-full ${meta?.color}`}>
                      {meta?.icon}{meta?.label}
                    </span>
                    <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.language}</span>
                  </div>
                </div>
                <span className="text-muted-foreground text-xs shrink-0">{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div className="border-t px-4 py-4 bg-muted/20">
                  <TemplatePreview components={t.components} />
                  <div className="mt-3 space-y-1">
                    {t.components.find((c) => c.type === "BODY")?.text?.match(/\{\{(\d+)\}\}/g)?.length ? (
                      <p className="text-xs text-muted-foreground">
                        Parâmetros:{" "}
                        {t.components.find((c) => c.type === "BODY")?.text?.match(/\{\{(\d+)\}\}/g)?.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
