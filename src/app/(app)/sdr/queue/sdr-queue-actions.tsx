"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import {
  CheckCircle, XCircle, Clock, Phone, MoreHorizontal, Share2,
} from "lucide-react";
import Link from "next/link";

interface Props {
  assignmentId: string;
  contactId: string;
  currentStatus: string;
}

export function SdrQueueActions({ assignmentId, contactId, currentStatus }: Props) {
  const [invalidDialog, setInvalidDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function move(status: "novo" | "em_contato" | "aguardando" | "qualificado" | "invalido") {
    startTransition(() => updateSdrAssignmentStatus(assignmentId, status));
  }

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        {/* Em contato */}
        {currentStatus === "novo" && (
          <Button
            size="sm" variant="ghost"
            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
            onClick={() => move("em_contato")}
            disabled={isPending}
            title="Iniciar contato"
          >
            <Phone className="h-4 w-4" />
          </Button>
        )}

        {/* Qualificar */}
        {currentStatus !== "qualificado" && currentStatus !== "invalido" && (
          <Button
            size="sm" variant="ghost"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => move("qualificado")}
            disabled={isPending}
            title="Qualificar → distribuir para corretor"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}

        {/* Distribuir (routing) — só para qualificados */}
        {currentStatus === "qualificado" && (
          <Button
            size="sm" variant="ghost"
            className="text-primary"
            nativeButton={false}
            render={<Link href={`/sdr/routing/${contactId}`} />}
            title="Distribuir para corretor"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}

        {/* Mais opções */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost" disabled={isPending}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {currentStatus !== "em_contato" && (
              <DropdownMenuItem onClick={() => move("em_contato")}>
                <Phone className="h-4 w-4 mr-2" /> Em contato
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => move("aguardando")}>
              <Clock className="h-4 w-4 mr-2" /> Aguardando retorno
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setInvalidDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" /> Invalidar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={invalidDialog} onOpenChange={setInvalidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalidar contato</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              placeholder="Ex: telefone inválido, spam, fora do perfil..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvalidDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                startTransition(() => updateSdrAssignmentStatus(assignmentId, "invalido", notes));
                setInvalidDialog(false);
              }}
              disabled={isPending}
            >
              Invalidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
