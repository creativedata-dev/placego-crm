"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle, Phone, ExternalLink, Flame, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhoneNumber {
  phoneNumberId: string;
  displayPhone: string;
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4" | "UNLIMITED";
  accountMode: "SANDBOX" | "LIVE";
  dailyLimit: number;
  verifiedName: string;
  status: string;
  nameStatus?: string;
}

interface HealthData {
  mode: "full" | "phone";
  // full
  wabaId?: string;
  name?: string;
  reviewStatus?: string;
  banState?: string;
  verified?: boolean;
  namespaceTemplates?: string;
  phoneNumbers: PhoneNumber[];
}

const TIER_ORDER = ["TIER_1", "TIER_2", "TIER_3", "TIER_4", "UNLIMITED"];
const TIER_LABELS: Record<string, string> = {
  TIER_1: "1k/dia", TIER_2: "10k/dia", TIER_3: "100k/dia", TIER_4: "1M/dia", UNLIMITED: "Ilimitado",
};
const TIER_FULL: Record<string, string> = {
  TIER_1: "1.000", TIER_2: "10.000", TIER_3: "100.000", TIER_4: "1.000.000", UNLIMITED: "∞",
};

function QualityBadge({ rating }: { rating: string }) {
  if (rating === "GREEN") return (
    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-semibold px-2 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Alta
    </span>
  );
  if (rating === "YELLOW") return (
    <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 text-xs font-semibold px-2 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> Média
    </span>
  );
  if (rating === "RED") return (
    <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 text-xs font-semibold px-2 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Baixa
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-zinc-500 bg-zinc-50 border text-xs font-semibold px-2 py-0.5 rounded-full">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Desconhecida
    </span>
  );
}

function QualityTips({ rating }: { rating: string }) {
  if (rating === "GREEN") return null;
  const tips = rating === "RED" || rating === "UNKNOWN" ? [
    "Reduza o volume de envios temporariamente (50% do limite atual)",
    "Revise os templates — evite linguagem promocional excessiva",
    "Aumente a proporção de mensagens respondidas (melhore o conteúdo)",
    "Verifique se há opt-outs em volume acima do normal",
  ] : [
    "Monitore a taxa de bloqueio por usuários",
    "Evite envios em massa sem segmentação",
    "Priorize templates com alta taxa de resposta",
  ];

  return (
    <div className={`mt-3 p-3 rounded-lg text-xs space-y-1 ${rating === "RED" || rating === "UNKNOWN" ? "bg-red-50 border border-red-200 text-red-800" : "bg-yellow-50 border border-yellow-200 text-yellow-800"}`}>
      <p className="font-semibold">Qualidade {rating === "UNKNOWN" ? "UNKNOWN" : "YELLOW"} — ações recomendadas:</p>
      <ul className="space-y-0.5 list-disc list-inside">
        {tips.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  );
}

function PhoneCard({ phone }: { phone: PhoneNumber }) {
  const tierIdx = TIER_ORDER.indexOf(phone.tier);
  const isWarmup = phone.tier === "TIER_1";

  return (
    <div className={`border rounded-xl p-4 space-y-4 ${phone.qualityRating === "RED" ? "border-red-200 bg-red-50/30" : phone.qualityRating === "YELLOW" ? "border-yellow-200 bg-yellow-50/20" : "bg-card"}`}>
      {/* Header do número */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
          <Phone className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{phone.displayPhone}</span>
            {isWarmup && (
              <span className="flex items-center gap-1 text-orange-600 bg-orange-50 border border-orange-200 text-xs font-medium px-2 py-0.5 rounded-full">
                <Flame className="h-3 w-3" /> Warmup
              </span>
            )}
            {phone.accountMode === "SANDBOX" && (
              <span className="text-yellow-700 bg-yellow-50 border border-yellow-200 text-xs font-medium px-2 py-0.5 rounded-full">
                Sandbox
              </span>
            )}
            {phone.accountMode === "LIVE" && (
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-medium px-2 py-0.5 rounded-full">
                Cloud API
              </span>
            )}
            <QualityBadge rating={phone.qualityRating} />
          </div>
          {phone.verifiedName && (
            <p className="text-xs text-muted-foreground mt-0.5">{phone.verifiedName}</p>
          )}
        </div>
      </div>

      {/* KPIs em grid */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Tier</p>
          <p className="font-bold text-base">{TIER_FULL[phone.tier]}/dia</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Verificação</p>
          <p className={`font-semibold text-sm ${phone.status === "VERIFIED" || phone.status === "CONNECTED" ? "text-emerald-600" : "text-zinc-500"}`}>
            {phone.status === "VERIFIED" || phone.status === "CONNECTED" ? "Verificado" : phone.status || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nome</p>
          <p className="font-semibold text-sm text-zinc-500">
            {phone.nameStatus === "AVAILABLE_WITHOUT_REVIEW" ? "Disponível" : phone.nameStatus || "—"}
          </p>
        </div>
      </div>

      {/* Barra de tier */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>0 enviados · {TIER_FULL[phone.tier]} disponíveis hoje (limite {TIER_FULL[phone.tier]}/dia)</span>
          <span>0%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "0%" }} />
        </div>

        {/* Progressão de tier */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TIER_ORDER.map((t, i) => (
              <div key={t} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${i <= tierIdx ? "bg-emerald-500" : "bg-muted-foreground/20"}`} />
                <span className={`text-xs ${i <= tierIdx ? "text-emerald-700 font-medium" : "text-muted-foreground"}`}>
                  {TIER_LABELS[t]}
                </span>
                {i < TIER_ORDER.length - 1 && <span className="text-muted-foreground/30 text-xs">→</span>}
              </div>
            ))}
          </div>
          {isWarmup && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  <Zap className="h-3 w-3" /> Plano de aquecimento
                </span>
                <span className="text-muted-foreground">30 → 1.000/dia</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-400 to-emerald-500 rounded-full" style={{ width: "8%" }} />
              </div>
              <p className="text-xs text-muted-foreground">
                Warmup S1-S12 prepara para 250/dia. Após S12, progressão automática pelo Meta por monitoramento de qualidade.
              </p>
            </div>
          )}
          {!isWarmup && tierIdx < TIER_ORDER.length - 1 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              → Próximo: <span className="font-medium">{TIER_LABELS[TIER_ORDER[tierIdx + 1]]}</span> (use ≥50%/dia por 7d + qualidade GREEN)
            </p>
          )}
        </div>
      </div>

      <QualityTips rating={phone.qualityRating} />
    </div>
  );
}

export function WabaHealth({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/waba/health?tenantId=${tenantId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao consultar");
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tenantId]);

  return (
    <div className="border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Saúde WABA</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Status da conta WhatsApp Business e números vinculados</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando Meta Graph API...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao consultar</p>
            <p className="text-xs mt-0.5 text-red-600">{error}</p>
            <p className="text-xs mt-1 text-red-500">Verifique se o Access Token tem permissão <code>whatsapp_business_management</code>.</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-6">
          {/* Business Account — só em modo full */}
          {data.mode === "full" && (
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Business Account (BM)</p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome da conta</p>
                  <p className="font-semibold">{data.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WABA ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{data.wabaId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ban state</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    data.banState === "NONE" || !data.banState
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                      : "text-red-700 bg-red-50 border border-red-200"
                  }`}>
                    {data.banState === "NONE" || !data.banState ? "Sem restrição" : data.banState}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verificação</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${data.verified ? "text-emerald-600" : "text-yellow-600"}`}>
                    {data.verified
                      ? <><CheckCircle className="h-3.5 w-3.5" /> Verificada</>
                      : <><AlertTriangle className="h-3.5 w-3.5" /> Pendente</>
                    }
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Revisão da conta</p>
                  <p className="font-semibold text-xs">{data.reviewStatus ?? "—"}</p>
                </div>
                {data.namespaceTemplates && (
                  <div>
                    <p className="text-xs text-muted-foreground">Namespace templates</p>
                    <p className="font-mono text-xs text-muted-foreground truncate">{data.namespaceTemplates}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Números vinculados */}
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              Números vinculados ({data.phoneNumbers.length})
            </p>
            {data.phoneNumbers.map((phone) => (
              <PhoneCard key={phone.phoneNumberId} phone={phone} />
            ))}
          </div>

          {/* Links úteis */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Links úteis</p>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "WhatsApp Manager", url: "https://business.facebook.com/wa/manage/home/" },
                { label: "Modelos de mensagens", url: "https://business.facebook.com/wa/manage/message-templates/" },
                { label: "Limites de mensagens", url: "https://business.facebook.com/wa/manage/phone-numbers/" },
                { label: "Insights", url: "https://business.facebook.com/wa/manage/insights/" },
              ].map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 rounded-md px-2.5 py-1.5 hover:bg-blue-100 transition-colors"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
