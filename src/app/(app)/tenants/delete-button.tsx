"use client";

import { Button } from "@/components/ui/button";
import { deleteTenant } from "@/app/actions/tenants";
import { Trash2 } from "lucide-react";

export function DeleteTenantButton({ id, name }: { id: string; name: string }) {
  async function handleDelete() {
    if (!confirm(`Excluir empresa "${name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteTenant(id);
  }

  return (
    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
