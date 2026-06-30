"use client";

import { useState } from "react";

const SCORE_BREAKDOWN = [
  { label: "Nome preenchido", points: "+20" },
  { label: "Telefone válido", points: "+30" },
  { label: "Email informado", points: "+20" },
  { label: "Campanha identificada", points: "+15" },
  { label: "UTM / anúncio rastreado", points: "+15" },
];

interface Props {
  score: number;
  compact?: boolean;
}

export function ScoreBadge({ score, compact = false }: Props) {
  const [open, setOpen] = useState(false);

  const color =
    score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-500";
  const bgColor =
    score >= 70 ? "bg-green-50 border-green-200" : score >= 40 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";
  const label =
    score >= 70 ? "Alta qualidade" : score >= 40 ? "Qualidade média" : "Qualidade baixa";

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${bgColor} ${color}`}
          title="Clique para entender o score"
        >
          {score}
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-full mt-2 z-20 w-56 bg-background border rounded-xl shadow-lg p-3 space-y-2">
              <div className="space-y-0.5">
                <p className={`text-sm font-semibold ${color}`}>{score}/100 — {label}</p>
              </div>
              <div className="border-t pt-2 space-y-1.5">
                {SCORE_BREAKDOWN.map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center min-w-[48px] pt-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex flex-col items-center rounded-lg px-2 py-1 border ${bgColor} hover:shadow-sm transition-all cursor-help`}
        title="Clique para entender o score"
      >
        <span className={`text-lg font-bold leading-none ${color}`}>{score}</span>
        <span className="text-[9px] text-muted-foreground font-medium">score</span>
      </button>

      {open && (
        <>
          {/* overlay para fechar */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          <div className="absolute left-0 top-full mt-2 z-20 w-56 bg-background border rounded-xl shadow-lg p-3 space-y-2">
            <div className="space-y-0.5">
              <p className={`text-sm font-semibold ${color}`}>{score}/100 — {label}</p>
              <p className="text-xs text-muted-foreground">
                O score indica o quão completo e rastreável é este lead.
              </p>
            </div>

            <div className="border-t pt-2 space-y-1.5">
              {SCORE_BREAKDOWN.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.points}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs border-t pt-1 mt-1">
                <span className="font-medium">Total máximo</span>
                <span className="font-bold">100</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground border-t pt-2">
              Leads com score ≥ 70 têm maior chance de conversão.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
