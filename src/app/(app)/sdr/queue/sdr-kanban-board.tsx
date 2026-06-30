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

const NON_DRAGGABLE_TARGET = new Set(["distribuido"]); // só via tela de routing

export function SdrKanbanBoard({ columns: initialColumns, isAdmin }: Props) {
  const [columns, setColumns] = useState(initialColumns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

    let card: CardData | undefined;
    const next = columns.map((col) => {
      const found = col.cards.find((c) => c.assignment.id === dragging);
      if (found) card = found;
      return { ...col, cards: col.cards.filter((c) => c.assignment.id !== dragging) };
    });

    if (!card) return;

    const updated = next.map((col) =>
      col.id === targetColId
        ? { ...col, cards: [...col.cards, { ...card!, assignment: { ...card!.assignment, status: targetColId as any } }] }
        : col
    );

    setColumns(updated);
    setDragging(null);
    setDragOver(null);

    startTransition(() => {
      updateSdrAssignmentStatus(card!.assignment.id, targetColId as any);
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
                onDragStart={() => handleDragStart(card.assignment.id)}
                onDragEnd={() => setDragging(null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
