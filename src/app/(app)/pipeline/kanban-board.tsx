"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { moveAssignment } from "@/app/actions/pipeline";
import { LeadCard } from "./lead-card";
import type { LeadAssignment, Lead, Tag } from "@/db/schema";

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

    startTransition(() => {
      moveAssignment(card.assignment.id, targetColId);
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
                onDragStart={() => setDragging(assignment.id)}
                onDragEnd={() => setDragging(null)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
