"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { moveAssignment } from "@/app/actions/pipeline";
import { LeadCard } from "./lead-card";
import type { LeadAssignment, Lead, Tag } from "@/db/schema";
import { ChevronDown } from "lucide-react";

const COL_CARD_BG: Record<string, string> = {
  new:       "bg-blue-50   dark:bg-blue-950/30   border-blue-100   dark:border-blue-900",
  contacted: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900",
  visiting:  "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900",
  proposal:  "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900",
  won:       "bg-green-50  dark:bg-green-950/30  border-green-100  dark:border-green-900",
  lost:      "bg-red-50    dark:bg-red-950/30    border-red-100    dark:border-red-900",
};

const COL_BG: Record<string, string> = {
  new:       "bg-blue-100/60   dark:bg-blue-950/50",
  contacted: "bg-yellow-100/60 dark:bg-yellow-950/50",
  visiting:  "bg-purple-100/60 dark:bg-purple-950/50",
  proposal:  "bg-orange-100/60 dark:bg-orange-950/50",
  won:       "bg-green-100/60  dark:bg-green-950/50",
  lost:      "bg-red-100/60    dark:bg-red-950/50",
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
            <div key={col.id} className={`border rounded-xl overflow-hidden ${COL_BG[col.id] ?? "bg-muted/30"}`}>
              <button
                onClick={() => toggleCol(col.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:brightness-95 transition-all text-left active:brightness-90"
              >
                <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${col.color}`} />
                <span className="font-semibold text-sm flex-1">{col.label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  col.cards.length > 0 ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {col.cards.length}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="flex flex-col gap-2 p-2 bg-background">
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
            className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border transition-colors ${
              COL_BG[col.id] ?? "bg-muted/40"
            } ${dragOver === col.id ? "ring-2 ring-primary brightness-95" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(col.id)}
          >
            <div className="flex items-center gap-2 px-3 py-3 border-b">
              <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="font-semibold text-sm">{col.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs">{col.cards.length}</Badge>
            </div>
            <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
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
