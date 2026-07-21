"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import { SdrLeadCard } from "./sdr-lead-card";
import type { STATUS_COLUMNS } from "./page";
import type { SdrAssignment, Lead, Tag } from "@/db/schema";
import { ChevronDown, ChevronRight } from "lucide-react";

// Tailwind classes precisam ser estáticas — mapa colId → bg tintado do card
const COL_CARD_BG: Record<string, string> = {
  novo:        "bg-blue-50   dark:bg-blue-950/30   border-blue-100   dark:border-blue-900",
  em_contato:  "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900",
  aguardando:  "bg-orange-50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-900",
  qualificado: "bg-green-50  dark:bg-green-950/30  border-green-100  dark:border-green-900",
  distribuido: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900",
  invalido:    "bg-red-50    dark:bg-red-950/30    border-red-100    dark:border-red-900",
  arquivado:   "bg-gray-50   dark:bg-gray-900/30   border-gray-200   dark:border-gray-800",
};

type CardData = {
  assignment: SdrAssignment;
  contact: Lead;
  propertyAddress: string | null;
  propertyNeighborhood: string | null;
  tenantName: string | null;
  sdrName: string | null;
  tags: Tag[];
  brokerNames: string[];
  unreadCount: number;
};

type ColumnData = {
  id: string;
  label: string;
  color: string;
  cards: CardData[];
};

interface Props {
  columns: ColumnData[];
  isAdmin: boolean;
}

const NON_DRAGGABLE_TARGET = new Set(["distribuido", "arquivado"]);
const NON_DRAGGABLE_SOURCE = new Set(["distribuido", "arquivado"]);

export function SdrKanbanBoard({ columns: initialColumns, isAdmin }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  // accordion mobile: primeira coluna com cards expandida por padrão
  const [openCols, setOpenCols] = useState<Set<string>>(() => {
    const first = initialColumns.find((c) => c.id !== "arquivado" && c.cards.length > 0);
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

  const mainColumns = columns.filter((c) => c.id !== "arquivado");
  const archivedColumn = columns.find((c) => c.id === "arquivado");

  function handleDrop(targetColId: string) {
    if (!dragging) return;
    if (NON_DRAGGABLE_TARGET.has(targetColId)) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    const card = initialColumns.flatMap((c) => c.cards).find((c) => c.assignment.id === dragging);
    if (!card) return;
    setOverrides((prev) => ({ ...prev, [dragging]: targetColId }));
    setDragging(null);
    setDragOver(null);
    startTransition(() => {
      updateSdrAssignmentStatus(card.assignment.id, targetColId as any);
    });
  }

  function moveCard(assignmentId: string, targetColId: string) {
    const card = initialColumns.flatMap((c) => c.cards).find((c) => c.assignment.id === assignmentId);
    if (!card) return;
    setOverrides((prev) => ({ ...prev, [assignmentId]: targetColId }));
    startTransition(() => {
      updateSdrAssignmentStatus(assignmentId, targetColId as any);
    });
  }

  return (
    <div className="space-y-4">
      {/* ── Mobile: accordion vertical colapsável ── */}
      <div className="md:hidden space-y-2 overflow-x-hidden">
        {mainColumns.map((col) => {
          const isOpen = openCols.has(col.id);
          const isLocked = NON_DRAGGABLE_SOURCE.has(col.id);
          return (
            <div key={col.id} className="border rounded-xl overflow-hidden">
              {/* Header coluna */}
              <button
                onClick={() => toggleCol(col.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left active:bg-muted/70"
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

              {/* Cards expandidos */}
              {isOpen && (
                <div className="flex flex-col gap-2 p-2 bg-background">
                  {col.cards.length === 0 ? (
                    <div className="text-center py-8 space-y-1">
                      <p className="text-2xl">😴</p>
                      <p className="text-sm font-medium text-muted-foreground">Nenhum contato aqui</p>
                      <p className="text-xs text-muted-foreground/70">Aguardando novos leads</p>
                    </div>
                  ) : (
                    col.cards.map((card) => (
                      <SdrLeadCard
                        key={card.assignment.id}
                        {...card}
                        isAdmin={isAdmin}
                        currentColId={col.id}
                        allColumns={mainColumns.map((c) => ({ id: c.id, label: c.label }))}
                        onMoveCard={isLocked ? undefined : moveCard}
                        onDragStart={undefined}
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
        {mainColumns.map((col) => (
          <div
            key={col.id}
            className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border bg-muted/40 transition-colors ${
              dragOver === col.id ? "ring-2 ring-primary bg-primary/5" : ""
            }`}
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
                  <p className="text-xs text-muted-foreground">Nenhum contato aqui</p>
                </div>
              )}
              {col.cards.map((card) => (
                <SdrLeadCard
                  key={card.assignment.id}
                  {...card}
                  isAdmin={isAdmin}
                  currentColId={col.id}
                  allColumns={mainColumns.map((c) => ({ id: c.id, label: c.label }))}
                  onMoveCard={undefined}
                  onDragStart={NON_DRAGGABLE_SOURCE.has(col.id) ? undefined : () => setDragging(card.assignment.id)}
                  onDragEnd={() => setDragging(null)}
                  cardBg={COL_CARD_BG[col.id]}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Seção arquivados — colapsável */}
      {archivedColumn && (
        <div className="border rounded-xl overflow-hidden">
          <button
            onClick={() => setArchivedOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
          >
            {archivedOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
            <span className="font-semibold text-sm">Arquivados</span>
            <Badge variant="secondary" className="text-xs">{archivedColumn.cards.length}</Badge>
          </button>
          {archivedOpen && (
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {archivedColumn.cards.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 col-span-full text-center">📦 Nenhum contato arquivado</p>
              )}
              {archivedColumn.cards.map((card) => (
                <SdrLeadCard
                  key={card.assignment.id}
                  {...card}
                  isAdmin={isAdmin}
                  currentColId="arquivado"
                  allColumns={[]}
                  onMoveCard={undefined}
                  onDragStart={undefined}
                  onDragEnd={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
