"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { moveAssignment } from "@/app/actions/pipeline";
import { LeadCard } from "./lead-card";
import type { LeadAssignment, Lead, Tag } from "@/db/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
  const [activeColIdx, setActiveColIdx] = useState(0);
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
    startTransition(() => moveAssignment(card.assignment.id, targetColId));
  }

  function handleMoveCard(assignmentId: string, targetColId: string) {
    const card = initialColumns.flatMap((c) => c.cards).find((c) => c.assignment.id === assignmentId);
    if (!card) return;
    setOverrides((prev) => ({ ...prev, [assignmentId]: targetColId }));
    startTransition(() => moveAssignment(assignmentId, targetColId));
  }

  const activeCol = columns[activeColIdx];

  return (
    <>
      {/* ── Mobile: coluna única com tabs ── */}
      <div className="md:hidden space-y-3 overflow-x-hidden">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {columns.map((col, idx) => (
            <button
              key={col.id}
              onClick={() => setActiveColIdx(idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
                activeColIdx === idx
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${col.color}`} />
              {col.label}
              {col.cards.length > 0 && (
                <span className={`text-[10px] px-1.5 rounded-full ${activeColIdx === idx ? "bg-background/20" : "bg-muted"}`}>
                  {col.cards.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveColIdx((i) => Math.max(0, i - 1))}
            disabled={activeColIdx === 0}
            className="p-1.5 rounded-lg border disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${activeCol?.color}`} />
            <span className="font-semibold text-sm">{activeCol?.label}</span>
            <Badge variant="secondary" className="text-xs">{activeCol?.cards.length}</Badge>
          </div>
          <button
            onClick={() => setActiveColIdx((i) => Math.min(columns.length - 1, i + 1))}
            disabled={activeColIdx === columns.length - 1}
            className="p-1.5 rounded-lg border disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-2">
          {activeCol?.cards.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8 border rounded-xl bg-muted/20">Vazio</p>
          )}
          {activeCol?.cards.map(({ assignment, lead, brokerName, tenantName, tags }) => (
            <LeadCard
              key={assignment.id}
              assignment={assignment}
              lead={lead}
              brokerName={brokerName}
              tenantName={tenantName}
              tags={tags}
              isAdmin={isAdmin}
              currentCol={activeCol.id}
              allColumns={columns.map((c) => ({ id: c.id, label: c.label }))}
              onMoveCard={handleMoveCard}
              onDragStart={() => {}}
              onDragEnd={() => {}}
            />
          ))}
        </div>
      </div>

      {/* ── Desktop: kanban horizontal com drag ── */}
      <div className="hidden md:flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
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
              <Badge variant="secondary" className="ml-auto text-xs">{col.cards.length}</Badge>
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
                  onMoveCard={undefined}
                  onDragStart={() => setDragging(assignment.id)}
                  onDragEnd={() => setDragging(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
