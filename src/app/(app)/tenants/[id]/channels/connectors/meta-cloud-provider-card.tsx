"use client";

import { useState, useTransition, useEffect } from "react";
import { saveMetaCloudConfig } from "../../whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  CheckCircle, XCircle, Loader2, Info, RefreshCw, Trash2,
  Phone, Flame, Zap, ExternalLink, AlertTriangle,
} from "lucide-react";

type Tab = "config" | "health" | "debug";

// ── Saúde WABA ──────────────────────────────────────────────────────────────

interface PhoneNumber {
  phoneNumberId: string;
  displayPhone: string;
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4" | "UNLIMITED";
  accountMode: string;
  dailyLimit: number;
  verifiedName: string;
  status: string;
  nameStatus?: string;
}

interface HealthData {
  mode: "full" | "phone";
  wabaId?: string;
  name?: string;
  reviewStatus?: string;
  banState?: string;
  verified?: boolean;
  namespaceTemplates?: string;
  phoneNumbers: PhoneNumber[];
}

const TIER_ORDER = ["TIER_1", "TIER_2", "TIER_3", "TIER_4", "UNLIMITED"];
const TIER_LABELS: Record<string, string> = { TIER_1: "1k/dia", TIER_2: "10k/dia", TIER_3: "100k/dia", TIER_4: "1M/dia", UNLIMITED: "Ilimitado" };
const TIER_FULL: Record<string, string> = { TIER_1: "1.000", TIER_2: "10.000", TIER_3: "100.000", TIER_4: "1.000.000", UNLIMITED: "∞" };

function QualityBadge({ rating }: { rating: string }) {
  const map: Record<string, string> = {
    GREEN: "text-emerald-700 bg-emerald-50 border-emerald-200",
    YELLOW: "text-yellow-700 bg-yellow-50 border-yellow-200",
    RED: "text-red-700 bg-red-50 border-red-200",
  };
  const label: Record<string, string> = { GREEN: "Alta", YELLOW: "Média", RED: "Baixa", UNKNOWN: "Desconhecida" };
  const dot: Record<string, string> = { GREEN: "bg-emerald-500", YELLOW: "bg-yellow-500", RED: "bg-red-500", UNKNOWN: "bg-zinc-400" };
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${map[rating] ?? "text-zinc-500 bg-zinc-50 border-zinc-200"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[rating] ?? "bg-zinc-400"}`} />
      {label[rating] ?? "Desconhecida"}
    </span>
  );
}

function WabaHealthPanel({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/waba/health?tenantId=${tenantId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao consultar");
      setData(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [tenantId]);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Consultando Meta Graph API...</div>;

  if (error) return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Erro ao consultar</p>
          <p className="text-xs mt-0.5">{error}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Tentar novamente</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar</Button>
      </div>

      {data?.mode === "full" && (
        <div className="border rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Business Account</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-semibold">{data.name}</p></div>
            <div><p className="text-xs text-muted-foreground">WABA ID</p><p className="font-mono text-xs text-muted-foreground">{data.wabaId}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">Ban state</p>
              <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full ${!data.banState || data.banState === "NONE" ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-red-700 bg-red-50 border border-red-200"}`}>
                {!data.banState || data.banState === "NONE" ? "Sem restrição" : data.banState}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verificação</p>
              <span className={`text-xs font-semibold flex items-center gap-1 ${data.verified ? "text-emerald-600" : "text-yellow-600"}`}>
                {data.verified ? <><CheckCircle className="h-3.5 w-3.5" />Verificada</> : <><AlertTriangle className="h-3.5 w-3.5" />Pendente</>}
              </span>
            </div>
            <div><p className="text-xs text-muted-foreground">Revisão</p><p className="text-xs font-semibold">{data.reviewStatus ?? "—"}</p></div>
            {data.namespaceTemplates && <div><p className="text-xs text-muted-foreground">Namespace</p><p className="font-mono text-xs text-muted-foreground truncate">{data.namespaceTemplates}</p></div>}
          </div>
        </div>
      )}

      {data?.phoneNumbers.map((phone) => {
        const tierIdx = TIER_ORDER.indexOf(phone.tier);
        const isWarmup = phone.tier === "TIER_1";
        return (
          <div key={phone.phoneNumberId} className={`border rounded-xl p-4 space-y-3 ${phone.qualityRating === "RED" ? "border-red-200 bg-red-50/30" : phone.qualityRating === "YELLOW" ? "border-yellow-200 bg-yellow-50/20" : ""}`}>
            <div className="flex items-start gap-3 flex-wrap">
              <div className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{phone.displayPhone}</span>
                  {isWarmup && <span className="flex items-center gap-1 text-orange-600 bg-orange-50 border border-orange-200 text-xs font-medium px-2 py-0.5 rounded-full"><Flame className="h-3 w-3" />Warmup</span>}
                  {phone.accountMode === "LIVE" && <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-medium px-2 py-0.5 rounded-full">Cloud API</span>}
                  <QualityBadge rating={phone.qualityRating} />
                </div>
                {phone.verifiedName && <p className="text-xs text-muted-foreground mt-0.5">{phone.verifiedName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Tier</p><p className="font-bold">{TIER_FULL[phone.tier]}/dia</p></div>
              <div><p className="text-xs text-muted-foreground">Verificação</p><p className={`font-semibold text-sm ${phone.status === "VERIFIED" || phone.status === "CONNECTED" ? "text-emerald-600" : "text-zinc-500"}`}>{phone.status === "VERIFIED" || phone.status === "CONNECTED" ? "Verificado" : phone.status || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-semibold text-sm text-zinc-500">{phone.nameStatus === "AVAILABLE_WITHOUT_REVIEW" ? "Disponível" : phone.nameStatus || "—"}</p></div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {TIER_ORDER.map((t, i) => (
                  <div key={t} className="flex items-center gap-1">
                    <div className={`h-2 w-2 rounded-full ${i <= tierIdx ? "bg-emerald-500" : "bg-muted-foreground/20"}`} />
                    <span className={`text-xs ${i <= tierIdx ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>{TIER_LABELS[t]}</span>
                    {i < TIER_ORDER.length - 1 && <span className="text-muted-foreground/30 text-xs">→</span>}
                  </div>
                ))}
              </div>
              {isWarmup && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-orange-600 font-medium"><Zap className="h-3 w-3" />Plano de aquecimento</span>
                    <span className="text-muted-foreground">30 → 1.000/dia</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-emerald-500 rounded-full" style={{ width: "8%" }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div className="border-t pt-3">
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "WhatsApp Manager", url: "https://business.facebook.com/wa/manage/home/" },
            { label: "Templates", url: "https://business.facebook.com/wa/manage/message-templates/" },
            { label: "Limites", url: "https://business.facebook.com/wa/manage/phone-numbers/" },
          ].map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 rounded-md px-2.5 py-1.5 hover:bg-blue-100 transition-colors">
              {link.label}<ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Debug Webhook ────────────────────────────────────────────────────────────

interface LogEntry {
  created_at: string;
  step: string;
  data: Record<string, unknown>;
}

const STEP_META: Record<string, { label: string; color: string }> = {
  "1_received":   { label: "1 · Webhook recebido",    color: "bg-blue-100 text-blue-800 border-blue-200" },
  "2_text":       { label: "2 · Texto extraído",       color: "bg-slate-100 text-slate-700 border-slate-200" },
  "3_phone":      { label: "3 · Phone normalizado",    color: "bg-slate-100 text-slate-700 border-slate-200" },
  "4_broker":     { label: "4 · Busca corretor",       color: "bg-purple-100 text-purple-800 border-purple-200" },
  "5_isPodeSim":  { label: "5 · isPodeSim?",           color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  "6_assignment": { label: "6 · Assignment",           color: "bg-orange-100 text-orange-800 border-orange-200" },
  "7_contact":    { label: "7 · Contato/lead",         color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  "8_sending":    { label: "8 · Enviando...",          color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  "9_sent_ok":    { label: "9 · Enviado ✓",            color: "bg-green-100 text-green-800 border-green-200" },
  "9_sent_error": { label: "9 · ERRO ✗",               color: "bg-red-100 text-red-800 border-red-200" },
};

function groupSessions(logs: LogEntry[]): LogEntry[][] {
  const sessions: LogEntry[][] = [];
  let current: LogEntry[] = [];
  for (const log of [...logs].reverse()) {
    if (log.step === "1_received" && current.length > 0) { sessions.push(current); current = []; }
    current.push(log);
  }
  if (current.length > 0) sessions.push(current);
  return sessions.reverse();
}

function SessionBadge({ session }: { session: LogEntry[] }) {
  const steps = session.map((s) => s.step);
  if (steps.includes("9_sent_ok")) return <span className="text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">SUCESSO</span>;
  if (steps.includes("9_sent_error")) return <span className="text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">ERRO</span>;
  return <span className="text-xs font-bold text-yellow-700 bg-yellow-100 border border-yellow-200 px-2 py-0.5 rounded-full">PAROU EM {steps[steps.length - 1]}</span>;
}

function DebugPanel() {
  const [sessions, setSessions] = useState<LogEntry[][]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/debug/whlogs");
      const data: LogEntry[] = await res.json();
      setSessions(groupSessions(data));
      setExpanded(0);
    } finally { setLoading(false); }
  }

  async function clear() {
    await fetch("/api/debug/whlogs", { method: "DELETE" });
    setSessions([]);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Últimas mensagens recebidas no webhook WABA</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={clear} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" />Limpar
          </Button>
        </div>
      </div>

      {!loading && sessions.length === 0 && (
        <div className="border rounded-xl p-8 text-center text-muted-foreground text-sm">
          <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-30" />
          <p>Nenhum log. Envie "Pode sim!" e clique Atualizar.</p>
        </div>
      )}

      {sessions.map((session, i) => {
        const first = session[0];
        const d = first?.data as any;
        return (
          <div key={i} className="border rounded-xl overflow-hidden">
            <button type="button" onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 text-left transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold font-mono">{d?.fromPhone ?? "—"}</span>
                  <SessionBadge session={session} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(first.created_at).toLocaleString("pt-BR")} · {session.length} steps
                </p>
              </div>
              <span className="text-muted-foreground text-xs">{expanded === i ? "▲" : "▼"}</span>
            </button>
            {expanded === i && (
              <div className="border-t divide-y">
                {session.map((log, j) => {
                  const meta = STEP_META[log.step] ?? { label: log.step, color: "bg-gray-100 text-gray-700 border-gray-200" };
                  return (
                    <div key={j} className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(log.created_at).toLocaleTimeString("pt-BR")}</span>
                      </div>
                      <pre className="text-xs bg-black/5 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

interface Props {
  tenantId: string;
  currentProvider: "evolution" | "meta_cloud";
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  metaVerifyToken: string;
  metaAutoWelcome: boolean;
}

export function MetaCloudProviderCard({
  tenantId, currentProvider, metaPhoneNumberId, metaAccessToken,
  metaWabaId, metaVerifyToken, metaAutoWelcome: initialAutoWelcome,
}: Props) {
  const [tab, setTab] = useState<Tab>("config");
  const [phoneId, setPhoneId] = useState(metaPhoneNumberId);
  const [token, setToken] = useState(metaAccessToken);
  const [wabaId, setWabaId] = useState(metaWabaId);
  const [verifyToken, setVerifyToken] = useState(metaVerifyToken);
  const [autoWelcome, setAutoWelcome] = useState(initialAutoWelcome);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      const res = await saveMetaCloudConfig(tenantId, {
        provider: "meta_cloud",
        metaPhoneNumberId: phoneId,
        metaAccessToken: token,
        metaWabaId: wabaId,
        metaVerifyToken: verifyToken,
        metaAutoWelcome: autoWelcome,
      });
      setResult(res);
    });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "config", label: "Configuração" },
    { key: "health", label: "Saúde WABA" },
    { key: "debug", label: "Debug Webhook" },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Configuração */}
      {tab === "config" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 text-xs">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Como obter as credenciais:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
                <li>Meta for Developers → seu app → WhatsApp → API Setup</li>
                <li>Copie o <strong>Phone Number ID</strong> do número verificado</li>
                <li>Gere um <strong>System User Token permanente</strong> no Business Manager</li>
                <li>O <strong>WABA ID</strong> está em WhatsApp → Configuration</li>
              </ol>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneId">Phone Number ID *</Label>
            <Input id="phoneId" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="123456789012345" className="h-9 text-sm font-mono" />
            <p className="text-xs text-muted-foreground">Meta for Developers → WhatsApp → API Setup</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Access Token (System User) *</Label>
            <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAxxxxx..." className="h-9 text-sm font-mono" />
            <p className="text-xs text-muted-foreground">Business Manager → System Users → Gerar novo token</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wabaId">WABA ID (opcional)</Label>
            <Input id="wabaId" value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="123456789012345" className="h-9 text-sm font-mono" />
            <p className="text-xs text-muted-foreground">WhatsApp Business Account ID</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyToken">Webhook Verify Token</Label>
            <Input id="verifyToken" value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} placeholder="token-secreto" className="h-9 text-sm font-mono" />
            <p className="text-xs text-muted-foreground">
              URL: <span className="font-mono">https://crm.placego.com.br/api/meta/webhook</span>
            </p>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t">
            <button type="button" role="switch" aria-checked={autoWelcome} onClick={() => setAutoWelcome((v) => !v)}
              className={`relative mt-0.5 shrink-0 h-5 w-9 rounded-full transition-colors ${autoWelcome ? "bg-green-500" : "bg-muted-foreground/30"}`}>
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoWelcome ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <div>
              <p className="text-sm font-medium">Template de boas-vindas automático</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ao receber novo contato, dispara <span className="font-mono">template_reativacao</span> abrindo a janela de 24h.
              </p>
            </div>
          </div>

          {result && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              {result.message}
            </div>
          )}

          <Button onClick={handleSave} disabled={isPending} size="sm">
            {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isPending ? "Salvando..." : "Salvar configuração"}
          </Button>
        </div>
      )}

      {/* Saúde WABA */}
      {tab === "health" && <WabaHealthPanel tenantId={tenantId} />}

      {/* Debug Webhook */}
      {tab === "debug" && <DebugPanel />}
    </div>
  );
}
