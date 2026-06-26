"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateSdrAssignmentStatus } from "@/app/actions/contacts";
import { CheckCircle, Share2 } from "lucide-react";
import Link from "next/link";

interface Props {
  assignmentId: string;
  contactId: string;
  currentStatus: string;
}

export function ContactStatusActions({ assignmentId, contactId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  function qualify() {
    startTransition(() => updateSdrAssignmentStatus(assignmentId, "qualificado"));
  }

  return (
    <div className="flex gap-2 shrink-0">
      {currentStatus !== "qualificado" && currentStatus !== "invalido" && (
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
