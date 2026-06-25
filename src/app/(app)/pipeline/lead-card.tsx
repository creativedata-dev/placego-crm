"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { moveAssignment, addActivity } from "@/app/actions/pipeline";
import type { LeadAssignment, Lead } from "@/db/schema";
import { Phone, MessageCircle, Mail, MapPin, StickyNote, ChevronRight, Plus } from "lucide-react";

const ACTIVITY_ICONS = {
  call: <Phone className="h-3 w-3" />,
  whatsapp: <MessageCircle className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  visit: <MapPin className="h-3 w-3" />,
  note: <StickyNote className="h-3 w-3" />,
};

interface Props {
  assignment: LeadAssignment;
  lead: Lead;
  brokerName: string;
  isAdmin: boolean;
  currentCol: string;
  allColumns: { id: string; label: string }[];
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function LeadCard({
  assignment,
  lead,
  brokerName,
  isAdmin,
  currentCol,
  allColumns,
  onDragStart,
  onDragEnd,
}: Props) {
  const [activityOpen, setActivityOpen] = useState(false);
  const [lossOpen, setLossOpen] = useState(false);
  const [lossReason, setLossReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const age = Math.floor(
    (Date.now() - new Date(assignment.assignedAt).getTime()) / 86400000
  );

  function handleMove(targetColId: string) {
    if (targetColId === "lost") {
      setLossOpen(true);
      return;
    }
    startTransition(() => moveAssignment(assignment.id, targetColId));
  }

  async function handleLossConfirm() {
    await moveAssignment(assignment.id, "lost", lossReason);
    setLossOpen(false);
  }

  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="bg-background border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-xs hover:shadow-sm transition-shadow space-y-2"
      >
        {/* Nome + dias */}
        <div className="flex items-start justify-between gap-1">
          <p className="font-semibold text-sm leading-tight">{lead.name}</p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
            {age === 0 ? "hoje" : `${age}d`}
          </span>
        </div>

        {/* Telefone */}
        <p className="text-xs text-muted-foreground">{lead.phone}</p>

        {/* Corretor (admin only) */}
        {isAdmin && (
          <Badge variant="outline" className="text-[10px]">{brokerName}</Badge>
        )}

        {/* Ações rápidas */}
        <div className="flex gap-1 pt-1 border-t">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs flex-1"
            onClick={() => setActivityOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Atividade
          </Button>

          {/* Mover para próxima coluna */}
          {(() => {
            const cols = allColumns.filter((c) => c.id !== currentCol && c.id !== "won");
            const next = allColumns.find(
              (c, i) => allColumns[i - 1]?.id === currentCol
            );
            return next ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => handleMove(next.id)}
                disabled={isPending}
                title={`Mover para ${next.label}`}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            ) : null;
          })()}
        </div>
      </div>

      {/* Dialog: registrar atividade */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar atividade — {lead.name}</DialogTitle>
          </DialogHeader>
          <form
            action={async (fd) => {
              fd.set("assignmentId", assignment.id);
              await addActivity(fd);
              setActivityOpen(false);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select name="type" defaultValue="call" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">📞 Ligação</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="email">✉️ Email</SelectItem>
                  <SelectItem value="visit">📍 Visita</SelectItem>
                  <SelectItem value="note">📝 Anotação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea name="notes" rows={3} placeholder="O que aconteceu?" />
            </div>
            <div className="space-y-2">
              <Label>Mover para etapa (opcional)</Label>
              <Select name="moveToStatus">
                <SelectTrigger>
                  <SelectValue placeholder="Manter na etapa atual" />
                </SelectTrigger>
                <SelectContent>
                  {allColumns
                    .filter((c) => c.id !== currentCol)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActivityOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: motivo de perda */}
      <Dialog open={lossOpen} onOpenChange={setLossOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da perda</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Descreva o motivo *</Label>
            <Textarea
              placeholder="Ex: cliente comprou com outro corretor, saiu do budget, perdeu interesse..."
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleLossConfirm}
              disabled={!lossReason.trim() || isPending}
            >
              Confirmar perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
