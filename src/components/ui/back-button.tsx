"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ label, href }: { label?: string; href?: string } = {}) {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 shrink-0 bg-zinc-600 hover:bg-zinc-700 border-zinc-600 text-white"
      onClick={() => href ? router.push(href) : history.back()}
    >
      <X className="h-4 w-4" />
      {label ?? "Fechar"}
    </Button>
  );
}
