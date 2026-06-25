"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { moveAssignment } from "@/app/actions/pipeline";
import { LeadCard } from "./lead-card";
import type { COLUMNS } from "./page";
import type { LeadAssignment, Lead } from "@/db/schema";

type ColumnData = {
  id: string;
  label: string;
  color: string;
  cards: { assignment: LeadAssignment; lead: Lead; brokerName: string }[];
};

interface Props {
  columns: ColumnData[];
  isAdmin: boolean;
}

export function KanbanBoard({ columns: initialColumns, isAdmin }: Props) {
  const [columns, setColumns] = useState(initialColumns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDragStart(assignmentId: string) {
    setDragging(assignmentId);
  }

  function handleDrop(targetColId: string) {
    if (!dragging || targetColId === dragOver) return;

    // Encontrar card e coluna origem
    let card: ColumnData["cards"][number] | undefined;
    const next = columns.map((col) => {
      const found = col.cards.find((c) => c.assignment.id === dragging);
      if (found) card = found;
      return { ...col, cards: col.cards.filter((c) => c.assignment.id !== dragging) };
    });

    if (!card) return;

    // Se arrastando para "lost", exigir motivo — handled no card
    const updated = next.map((col) =>
      col.id === targetColId
        ? { ...col, cards: [...col.cards, { ...card!, assignment: { ...card!.assignment, status: targetColId as any } }] }
        : col
    );

    setColumns(updated);
    setDragging(null);
    setDragOver(null);

    startTransition(() => {
      moveAssignment(card!.assignment.id, targetColId);
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
            {col.cards.map(({ assignment, lead, brokerName }) => (
              <LeadCard
                key={assignment.id}
                assignment={assignment}
                lead={lead}
                brokerName={brokerName}
                isAdmin={isAdmin}
                currentCol={col.id}
                allColumns={columns.map((c) => ({ id: c.id, label: c.label }))}
                onDragStart={() => handleDragStart(assignment.id)}
                onDragEnd={() => setDragging(null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
