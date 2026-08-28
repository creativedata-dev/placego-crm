"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { distributeLeadToBroker } from "@/app/actions/gestor";
import { moveAssignment } from "@/app/actions/pipeline";
import type { LeadAssignment, Lead } from "@/db/schema";
import { ChevronDown, Building2, Loader2, Send } from "lucide-react";
import Link from "next/link";

const COL_CARD_BG: Record<string, string> = {
  new:       "bg-blue-100   border-blue-300",
  contacted: "bg-yellow-100 border-yellow-300",
  visiting:  "bg-purple-100 border-purple-300",
  proposal:  "bg-orange-100 border-orange-300",
  won:       "bg-green-100  border-green-300",
  lost:      "bg-red-100    border-red-300",
};

const COL_HEADER: Record<string, string> = {
  new:       "bg-blue-900   text-white",
  contacted: "bg-yellow-500 text-white",
  visiting:  "bg-purple-600 text-white",
  proposal:  "bg-orange-500 text-white",
  won:       "bg-green-600  text-white",
  lost:      "bg-red-600    text-white",
};

const COL_BG: Record<string, string> = {
  new:       "bg-blue-50",
  contacted: "bg-yellow-50",
  visiting:  "bg-purple-50",
  proposal:  "bg-orange-50",
  won:       "bg-green-50",
  lost:      "bg-red-50",
};

type Card = {
  assignment: LeadAssignment;
  lead: Lead;
  brokerName: string;
  tenantName: string | null;
  tags: any[];
};

type ColumnData = {
  id: string;
  label: string;
  color: string;
  cards: Card[];
};

interface Props {
  columns: ColumnData[];
  brokers: { id: string; name: string; phone: string | null }[];
}

export function GestorKanban({ columns: initialColumns, brokers }: Props) {
  const [openCols, setOpenCols] = useState<Set<string>>(() => {
    const first = initialColumns.find((c) => c.cards.length > 0);
    return new Set(first ? [first.id] : [initialColumns[0]?.id ?? ""]);
  });

  function toggleCol(id: string) {
    setOpenCols((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const total = initialColumns.reduce((s, c) => s + c.cards.length, 0);

  return (
    <div className="space-y-2">
      {initialColumns.map((col) => {
        const isOpen = openCols.has(col.id);
        const headerCls = COL_HEADER[col.id] ?? "bg-gray-600 text-white";
        const bgCls = COL_BG[col.id] ?? "bg-gray-50";

        return (
          <div key={col.id} className="rounded-xl overflow-hidden border shadow-sm">
            <button
              onClick={() => toggleCol(col.id)}
              className={`w-full flex items-center justify-between px-4 py-3 ${headerCls}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{col.label}</span>
                {col.cards.length > 0 && (
                  <span className="bg-red-600 text-white text-sm font-black rounded-full px-2 py-0.5 leading-none">
                    {col.cards.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
              <div className={`${bgCls} p-3 space-y-2`}>
                {col.cards.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead</p>
                ) : (
                  col.cards.map((card) => (
                    <GestorCard
                      key={card.assignment.id}
                      card={card}
                      colId={col.id}
                      colCardBg={COL_CARD_BG[col.id] ?? "bg-gray-100"}
                      brokers={brokers}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}

      {total === 0 && (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum lead recebido ainda</p>
          <p className="text-sm mt-1">Aguarde o SDR distribuir leads para você</p>
        </div>
      )}
    </div>
  );
}

function GestorCard({
  card, colId, colCardBg, brokers,
}: {
  card: Card;
  colId: string;
  colCardBg: string;
  brokers: { id: string; name: string; phone: string | null }[];
}) {
  const [showDistribute, setShowDistribute] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { assignment, lead } = card;

  function handleDistribute() {
    if (!selectedBroker) return;
    setError(null);
    startTransition(async () => {
      const result = await distributeLeadToBroker(assignment.id, selectedBroker, notes || undefined);
      if ("error" in result) setError(result.error as string);
      else setShowDistribute(false);
    });
  }

  const originEmoji: Record<string, string> = {
    meta_leadgen: "📋", whatsapp: "💬", lp: "🌐",
    manual: "✍️", email: "✉️", indicacao: "🤝", portal: "🏠",
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${colCardBg}`}>
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{lead.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {lead.phone && <span className="text-xs text-muted-foreground">📞 {lead.phone}</span>}
            <span className="text-xs text-muted-foreground">
              {originEmoji[lead.origin] ?? "📌"} {lead.origin}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-sm font-bold ${(lead.qualityScore ?? 0) >= 70 ? "text-green-600" : (lead.qualityScore ?? 0) >= 40 ? "text-yellow-600" : "text-red-500"}`}>
            {lead.qualityScore ?? 0}
          </span>
          <p className="text-[10px] text-muted-foreground">score</p>
        </div>
      </div>

      {/* Observação do SDR */}
      {assignment.notes && (
        <p className="text-xs text-muted-foreground bg-white/60 rounded px-2 py-1 italic">
          {assignment.notes}
        </p>
      )}

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        <Link
          href={`/pipeline/${assignment.id}`}
          className="text-xs font-medium text-slate-600 border border-slate-300 bg-white/70 hover:bg-white rounded-md px-2.5 py-1.5 transition-colors"
        >
          Ver conversa
        </Link>

        {colId === "new" && (
          <Button
            size="sm"
            className="h-7 text-xs bg-blue-900 hover:bg-blue-800 text-white"
            onClick={() => setShowDistribute((v) => !v)}
          >
            <Send className="h-3 w-3 mr-1" />
            Distribuir
          </Button>
        )}
      </div>

      {/* Painel de distribuição inline */}
      {showDistribute && (
        <div className="border rounded-lg bg-white p-3 space-y-2 mt-1">
          <p className="text-xs font-semibold text-slate-700">Selecione o corretor</p>

          {brokers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum corretor ativo vinculado à sua imobiliária.
            </p>
          ) : (
            <>
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none"
              >
                <option value="">Selecione...</option>
                {brokers.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observação para o corretor (opcional)"
                rows={2}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none focus:outline-none"
              />

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleDistribute}
                  disabled={!selectedBroker || isPending}
                >
                  {isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Confirmar distribuição
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setShowDistribute(false)}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
