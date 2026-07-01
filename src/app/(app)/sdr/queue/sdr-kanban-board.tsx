"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import { SdrLeadCard } from "./sdr-lead-card";
import type { STATUS_COLUMNS } from "./page";
import type { SdrAssignment, Lead, Tag } from "@/db/schema";

type CardData = {
  assignment: SdrAssignment;
  contact: Lead;
  propertyAddress: string | null;
  propertyNeighborhood: string | null;
  tenantName: string | null;
  sdrName: string | null;
  tags: Tag[];
  brokerNames: string[];
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

// "distribuido" só é definido pelo sistema via tela de routing — não pode ser destino nem origem de drag
const NON_DRAGGABLE_TARGET = new Set(["distribuido"]);
const NON_DRAGGABLE_SOURCE = new Set(["distribuido"]);

export function SdrKanbanBoard({ columns: initialColumns, isAdmin }: Props) {
  // overrides: mapa assignmentId → colId para atualização otimista do drag
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Aplica overrides sobre as colunas vindas do servidor
  const columns = initialColumns.map((col) => ({
    ...col,
    cards: [
      ...col.cards.filter((c) => !overrides[c.assignment.id] || overrides[c.assignment.id] === col.id),
      ...initialColumns.flatMap((c) => c.cards).filter(
        (c) => overrides[c.assignment.id] === col.id && !col.cards.find((x) => x.assignment.id === c.assignment.id)
      ),
    ],
  }));

  function handleDragStart(assignmentId: string) {
    setDragging(assignmentId);
  }

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
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
      {columns.map((col) => (
        <div
          key={col.id}
          className={`flex flex-col min-w-[260px] w-[260px] rounded-xl border bg-muted/40 transition-colors ${
            dragOver === col.id ? "ring-2 ring-primary bg-primary/5" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(col.id);
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => handleDrop(col.id)}
        >
          {/* Header da coluna */}
          <div className="flex items-center gap-2 px-3 py-3 border-b">
            <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
            <span className="font-semibold text-sm">{col.label}</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {col.cards.length}
            </Badge>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2 p-2 flex-1 min-h-[120px]">
            {col.cards.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">Vazio</p>
            )}
            {col.cards.map((card) => (
              <SdrLeadCard
                key={card.assignment.id}
                {...card}
                isAdmin={isAdmin}
                onDragStart={NON_DRAGGABLE_SOURCE.has(col.id) ? undefined : () => handleDragStart(card.assignment.id)}
                onDragEnd={() => setDragging(null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
