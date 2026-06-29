"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleUserActive } from "@/app/actions/users";

export function ToggleActiveButton({ userId, isActive, userName }: { userId: string; isActive: boolean; userName: string }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!isActive || confirm(`Desativar "${userName}"? O usuário perderá acesso imediatamente.`)) {
      startTransition(() => toggleUserActive(userId, !isActive));
    }
  }

  return (
    <Button
      variant="ghost" size="sm"
      className={isActive ? "text-muted-foreground hover:text-destructive" : "text-green-600 hover:text-green-700"}
      onClick={handle}
      disabled={isPending}
    >
      {isActive ? "Desativar" : "Ativar"}
    </Button>
  );
}
