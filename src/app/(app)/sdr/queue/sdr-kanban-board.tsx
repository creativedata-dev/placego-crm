"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import { SdrLeadCard } from "./sdr-lead-card";
import type { STATUS_COLUMNS } from "./page";
import type { SdrAssignment, Lead, Tag } from "@/db/schema";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  const [, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      {/* Kanban principal */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
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
              <Badge variant="secondary" className="ml-auto text-xs">
                {col.cards.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
              {col.cards.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>
              )}
              {col.cards.map((card) => (
                <SdrLeadCard
                  key={card.assignment.id}
                  {...card}
                  isAdmin={isAdmin}
                  onDragStart={NON_DRAGGABLE_SOURCE.has(col.id) ? undefined : () => {
                    setDragging(card.assignment.id);
                  }}
                  onDragEnd={() => setDragging(null)}
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
                <p className="text-xs text-muted-foreground py-4 col-span-full text-center">Nenhum contato arquivado</p>
              )}
              {archivedColumn.cards.map((card) => (
                <SdrLeadCard
                  key={card.assignment.id}
                  {...card}
                  isAdmin={isAdmin}
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
