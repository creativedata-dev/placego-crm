"use client";

import { Button } from "@/components/ui/button";

export function BackButton({ label = "Cancelar" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" onClick={() => history.back()}>
      {label}
    </Button>
  );
}
