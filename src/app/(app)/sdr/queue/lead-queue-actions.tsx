"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { qualifyLead, invalidateLead, markDuplicate, putLeadOnWait } from "@/app/actions/leads";
import { CheckCircle, XCircle, Clock, Copy, MoreHorizontal, Share2 } from "lucide-react";
import Link from "next/link";

interface Props {
  leadId: string;
  currentStatus: string;
}

export function LeadQueueActions({ leadId, currentStatus }: Props) {
  const [invalidDialog, setInvalidDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(action: () => Promise<void>) {
    setLoading(true);
    await action();
    setLoading(false);
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {currentStatus !== "qualified" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={() => handle(() => qualifyLead(leadId))}
            disabled={loading}
            title="Qualificar"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          nativeButton={false} render={<Link href={`/sdr/routing/${leadId}`} />}
          title="Distribuir"
        >
          <Share2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="sm" variant="ghost" disabled={loading}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handle(() => putLeadOnWait(leadId))}>
              <Clock className="h-4 w-4 mr-2" />
              Aguardando
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handle(() => markDuplicate(leadId))}>
              <Copy className="h-4 w-4 mr-2" />
              Marcar duplicado
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setInvalidDialog(true)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Invalidar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={invalidDialog} onOpenChange={setInvalidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invalidar lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              placeholder="Ex: telefone inválido, sem interesse, fora do perfil..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvalidDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setLoading(true);
                await invalidateLead(leadId, reason);
                setInvalidDialog(false);
                setLoading(false);
              }}
              disabled={loading}
            >
              Invalidar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
