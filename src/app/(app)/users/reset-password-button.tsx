"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendPasswordReset } from "@/app/actions/users";

export function ResetPasswordButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!confirm(`Enviar email de redefinição de senha para ${userEmail}?`)) return;
    startTransition(async () => {
      await sendPasswordReset(userId);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    });
  }

  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handle} disabled={isPending || sent}>
      {sent ? "✓ Enviado" : "Reset senha"}
    </Button>
  );
}
