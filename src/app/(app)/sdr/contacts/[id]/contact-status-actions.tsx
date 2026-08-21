"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import { CheckCircle, Share2, UserCheck, XCircle, Archive, RotateCcw } from "lucide-react";
import Link from "next/link";

interface Props {
  assignmentId: string;
  contactId: string;
  currentStatus: string;
  brokerName: string | null;
}

export function ContactStatusActions({ assignmentId, contactId, currentStatus, brokerName }: Props) {
  const [isPending, startTransition] = useTransition();

  function setStatus(status: Parameters<typeof updateSdrAssignmentStatus>[1]) {
    startTransition(() => updateSdrAssignmentStatus(assignmentId, status));
  }

  const isArchived = currentStatus === "arquivado";
  const isInvalid = currentStatus === "invalido";

  return (
    <div className="flex gap-2 shrink-0 items-center flex-wrap justify-end">
      {/* Badge de corretor quando distribuído */}
      {currentStatus === "distribuido" && brokerName && (
        <span className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2.5 py-1.5 font-medium">
          <UserCheck className="h-3.5 w-3.5" />
          {brokerName}
        </span>
      )}

      {/* Reabrir — arquivado ou inválido */}
      {(isArchived || isInvalid) && (
        <Button size="sm" variant="outline" onClick={() => setStatus("novo")} disabled={isPending}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reabrir
        </Button>
      )}

      {/* Qualificar — disponível em todos exceto qualificado, distribuído, arquivado */}
      {!["qualificado", "distribuido", "arquivado", "invalido"].includes(currentStatus) && (
        <Button size="sm" onClick={() => setStatus("qualificado")} disabled={isPending}
          className="text-green-700 bg-green-50 border border-green-200 hover:bg-green-100">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Qualificar
        </Button>
      )}

      {/* Distribuir — qualificado ou distribuído (redistribuir) */}
      {(currentStatus === "qualificado" || currentStatus === "distribuido") && (
        <Button size="sm" nativeButton={false} render={<Link href={`/sdr/routing/${contactId}`} />}>
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          {currentStatus === "distribuido" ? "Redistribuir" : "Distribuir"}
        </Button>
      )}

      {/* Inválido e Arquivar — em qualquer status ativo */}
      {!isArchived && !isInvalid && (
        <>
          <Button size="sm" variant="outline" onClick={() => setStatus("invalido")} disabled={isPending}
            className="text-orange-600 border-orange-200 hover:bg-orange-50">
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Inválido
          </Button>
          <Button size="sm" variant="outline" onClick={() => setStatus("arquivado")} disabled={isPending}
            className="text-zinc-500 border-zinc-200 hover:bg-zinc-50">
            <Archive className="h-3.5 w-3.5 mr-1.5" />
            Arquivar
          </Button>
        </>
      )}
    </div>
  );
}
