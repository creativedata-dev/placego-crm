"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { moveAssignment } from "@/app/actions/pipeline";
import { LeadCard } from "./lead-card";
import type { LeadAssignment, Lead, Tag } from "@/db/schema";
import { ChevronDown } from "lucide-react";

const COL_CARD_BG: Record<string, string> = {
  new:       "bg-blue-100   border-blue-300   dark:bg-blue-900/50   dark:border-blue-700",
  contacted: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/50 dark:border-yellow-700",
  visiting:  "bg-purple-100 border-purple-300 dark:bg-purple-900/50 dark:border-purple-700",
  proposal:  "bg-orange-100 border-orange-300 dark:bg-orange-900/50 dark:border-orange-700",
  won:       "bg-green-100  border-green-300  dark:bg-green-900/50  dark:border-green-700",
  lost:      "bg-red-100    border-red-300    dark:bg-red-900/50    dark:border-red-700",
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
  new:       "bg-blue-50   dark:bg-blue-950/40",
  contacted: "bg-yellow-50 dark:bg-yellow-950/40",
  visiting:  "bg-purple-50 dark:bg-purple-950/40",
  proposal:  "bg-orange-50 dark:bg-orange-950/40",
  won:       "bg-green-50  dark:bg-green-950/40",
  lost:      "bg-red-50    dark:bg-red-950/40",
};

type ColumnData = {
  id: string;
  label: string;
  color: string;
  cards: { assignment: LeadAssignment; lead: Lead; brokerName: string; tenantName: string | null; tags: Tag[] }[];
};

interface Props {
  columns: ColumnData[];
  isAdmin: boolean;
}

export function KanbanBoard({ columns: initialColumns, isAdmin }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [openCols, setOpenCols] = useState<Set<string>>(() => {
    const first = initialColumns.find((c) => c.cards.length > 0);
    return new Set(first ? [first.id] : [initialColumns[0]?.id ?? ""]);
  });
  const [, startTransition] = useTransition();

  function toggleCol(id: string) {
    setOpenCols((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const columns = initialColumns.map((col) => ({
    ...col,
    cards: [
      ...col.cards.filter((c) => !overrides[c.assignment.id] || overrides[c.assignment.id] === col.id),
      ...initialColumns.flatMap((c) => c.cards).filter(
        (c) => overrides[c.assignment.id] === col.id && !col.cards.find((x) => x.assignment.id === c.assignment.id)
      ),
    ],
  }));

  function handleDrop(targetColId: string) {
    if (!dragging) return;
    const card = initialColumns.flatMap((c) => c.cards).find((c) => c.assignment.id === dragging);
    if (!card || card.assignment.status === targetColId) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    setOverrides((prev) => ({ ...prev, [dragging]: targetColId }));
    setDragging(null);
    setDragOver(null);
    startTransition(() => moveAssignment(card.assignment.id, targetColId));
  }

  function handleMoveCard(assignmentId: string, targetColId: string) {
    const card = initialColumns.flatMap((c) => c.cards).find((c) => c.assignment.id === assignmentId);
    if (!card) return;
    setOverrides((prev) => ({ ...prev, [assignmentId]: targetColId }));
    startTransition(() => moveAssignment(assignmentId, targetColId));
  }

  return (
    <>
      {/* ── Mobile: accordion vertical colapsável ── */}
      <div className="md:hidden space-y-2 overflow-x-hidden">
        {columns.map((col) => {
          const isOpen = openCols.has(col.id);
          return (
            <div key={col.id} className="border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleCol(col.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 hover:brightness-90 transition-all text-left active:brightness-85 ${COL_HEADER[col.id] ?? "bg-muted text-foreground"}`}
              >
                <span className="font-bold text-sm flex-1">{col.label}</span>
                <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm">
                  {col.cards.length}
                </span>
                <ChevronDown className={`h-4 w-4 text-white/80 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className={`flex flex-col gap-2 p-2 ${COL_BG[col.id] ?? "bg-muted/20"}`}>
                  {col.cards.length === 0 ? (
                    <div className="text-center py-8 space-y-1">
                      <p className="text-2xl">😴</p>
                      <p className="text-sm font-medium text-muted-foreground">Nenhum lead aqui</p>
                      <p className="text-xs text-muted-foreground/70">Aguardando distribuição</p>
                    </div>
                  ) : (
                    col.cards.map(({ assignment, lead, brokerName, tenantName, tags }) => (
                      <LeadCard
                        key={assignment.id}
                        assignment={assignment}
                        lead={lead}
                        brokerName={brokerName}
                        tenantName={tenantName}
                        tags={tags}
                        isAdmin={isAdmin}
                        currentCol={col.id}
                        allColumns={columns.map((c) => ({ id: c.id, label: c.label }))}
                        onMoveCard={handleMoveCard}
                        onDragStart={() => {}}
                        onDragEnd={() => {}}
                        cardBg={COL_CARD_BG[col.id]}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: kanban horizontal com drag ── */}
      <div className="hidden md:flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border overflow-hidden transition-colors ${
              dragOver === col.id ? "ring-2 ring-primary brightness-95" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.id)}
          >
            <div className={`flex items-center gap-2 px-3 py-3 ${COL_HEADER[col.id] ?? "bg-muted"}`}>
              <span className="font-bold text-sm text-white flex-1">{col.label}</span>
              <span className="text-sm font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-sm">{col.cards.length}</span>
            </div>
            <div className={`flex flex-col gap-2 p-2 flex-1 min-h-[120px] ${COL_BG[col.id] ?? "bg-muted/20"}`}>
              {col.cards.length === 0 && (
                <div className="text-center py-6 space-y-1">
                  <p className="text-lg">😴</p>
                  <p className="text-xs text-muted-foreground">Nenhum lead aqui</p>
                </div>
              )}
              {col.cards.map(({ assignment, lead, brokerName, tenantName, tags }) => (
                <LeadCard
                  key={assignment.id}
                  assignment={assignment}
                  lead={lead}
                  brokerName={brokerName}
                  tenantName={tenantName}
                  tags={tags}
                  isAdmin={isAdmin}
                  currentCol={col.id}
                  allColumns={columns.map((c) => ({ id: c.id, label: c.label }))}
                  onMoveCard={undefined}
                  onDragStart={() => setDragging(assignment.id)}
                  onDragEnd={() => setDragging(null)}
                  cardBg={COL_CARD_BG[col.id]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
