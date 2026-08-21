"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhoneHealth {
  displayPhone: string;
  verifiedName: string;
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4" | "UNLIMITED";
  accountMode: "SANDBOX" | "LIVE";
  dailyLimit: number;
}

const TIER_LABELS: Record<string, string> = {
  TIER_1: "Tier 1",
  TIER_2: "Tier 2",
  TIER_3: "Tier 3",
  TIER_4: "Tier 4",
  UNLIMITED: "Ilimitado",
};

const TIER_LIMITS: Record<string, string> = {
  TIER_1: "1.000/dia",
  TIER_2: "10.000/dia",
  TIER_3: "100.000/dia",
  TIER_4: "1.000.000/dia",
  UNLIMITED: "Sem limite",
};

export function WabaHealth({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<PhoneHealth | null>(null);
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

  function QualityBadge({ rating }: { rating: string }) {
    if (rating === "GREEN") return (
      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded-full">
        <CheckCircle className="h-3.5 w-3.5" /> Alta
      </span>
    );
    if (rating === "YELLOW") return (
      <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 border border-yellow-200 text-xs font-medium px-2.5 py-1 rounded-full">
        <AlertTriangle className="h-3.5 w-3.5" /> Média
      </span>
    );
    if (rating === "RED") return (
      <span className="flex items-center gap-1 text-red-700 bg-red-50 border border-red-200 text-xs font-medium px-2.5 py-1 rounded-full">
        <XCircle className="h-3.5 w-3.5" /> Baixa
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-zinc-500 bg-zinc-50 border text-xs font-medium px-2.5 py-1 rounded-full">
        Desconhecida
      </span>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Wifi className="h-4 w-4 text-muted-foreground" />
            Saúde do número WABA
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Status em tempo real via Meta Graph API</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Consultando Meta API...
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erro ao consultar</p>
            <p className="text-red-600 text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Número e nome */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
            <div className="h-9 w-9 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              W
            </div>
            <div>
              <p className="font-semibold text-sm">{data.displayPhone}</p>
              <p className="text-xs text-muted-foreground">{data.verifiedName}</p>
            </div>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
              data.accountMode === "LIVE"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {data.accountMode === "LIVE" ? "Produção" : "Sandbox"}
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Qualidade</p>
              <QualityBadge rating={data.qualityRating} />
              <p className="text-xs text-muted-foreground">
                {data.qualityRating === "GREEN" && "Número com boa reputação"}
                {data.qualityRating === "YELLOW" && "Atenção: qualidade em queda"}
                {data.qualityRating === "RED" && "Risco de bloqueio — reduza envios"}
                {data.qualityRating === "UNKNOWN" && "Aguardando dados do Meta"}
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tier atual</p>
              <p className="text-lg font-bold">{TIER_LABELS[data.tier]}</p>
              <p className="text-xs text-muted-foreground">{TIER_LIMITS[data.tier]} conversas</p>
            </div>
          </div>

          {/* Barra de limite */}
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Limite diário de conversas</p>
              <p className="text-sm font-semibold">{data.dailyLimit.toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex gap-1.5">
              {["TIER_1","TIER_2","TIER_3","TIER_4","UNLIMITED"].map((t, i) => {
                const tiers = ["TIER_1","TIER_2","TIER_3","TIER_4","UNLIMITED"];
                const current = tiers.indexOf(data.tier);
                const filled = i <= current;
                return (
                  <div key={t} className={`h-2 flex-1 rounded-full ${filled ? "bg-emerald-500" : "bg-muted"}`} />
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Para subir de tier, mantenha qualidade VERDE e aumente gradualmente o volume de envios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
