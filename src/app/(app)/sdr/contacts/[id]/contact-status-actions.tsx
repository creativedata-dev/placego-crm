"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import { CheckCircle, Share2, UserCheck } from "lucide-react";
import Link from "next/link";

interface Props {
  assignmentId: string;
  contactId: string;
  currentStatus: string;
  brokerName: string | null;
}

export function ContactStatusActions({ assignmentId, contactId, currentStatus, brokerName }: Props) {
  const [isPending, startTransition] = useTransition();

  function qualify() {
    startTransition(() => updateSdrAssignmentStatus(assignmentId, "qualificado"));
  }

  const isDone = currentStatus === "qualificado" || currentStatus === "distribuido" || currentStatus === "invalido";

  return (
    <div className="flex gap-2 shrink-0 items-center">
      {currentStatus === "distribuido" && brokerName && (
        <span className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-md px-2.5 py-1.5 font-medium">
          <UserCheck className="h-3.5 w-3.5" />
          {brokerName}
        </span>
      )}
      {!isDone && (
        <Button size="sm" onClick={qualify} disabled={isPending} className="text-green-700 bg-green-50 border border-green-200 hover:bg-green-100">
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Qualificar
        </Button>
      )}
      {currentStatus === "qualificado" && (
        <Button size="sm" nativeButton={false} render={<Link href={`/sdr/routing/${contactId}`} />}>
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Distribuir
        </Button>
      )}
    </div>
  );
}
