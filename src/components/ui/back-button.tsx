"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function BackButton({ label }: { label?: string } = {}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
      onClick={() => history.back()}
    >
      <X className="h-4 w-4" />
      {label ?? "Fechar"}
    </Button>
  );
}
