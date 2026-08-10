"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ label, href }: { label?: string; href?: string } = {}) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
      onClick={() => href ? router.push(href) : history.back()}
    >
      <X className="h-4 w-4" />
      {label ?? "Fechar"}
    </Button>
  );
}
