"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendPasswordReset } from "@/app/actions/users";

export function ResetPasswordButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [state, setState] = useState<{ sent?: boolean; error?: string; link?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handle() {
    if (!confirm(`Enviar email de redefinição de senha para ${userEmail}?`)) return;
    startTransition(async () => {
      const result = await sendPasswordReset(userId);
      if (!result.ok) {
        setState({ error: result.error });
      } else if (result.link) {
        setState({ sent: true, link: result.link, error: result.error });
      } else {
        setState({ sent: true });
        setTimeout(() => setState(null), 4000);
      }
    });
  }

  function copyLink() {
    if (state?.link) {
      navigator.clipboard.writeText(state.link);
      alert("Link copiado!");
    }
  }

  if (state?.error && !state.sent) {
    return (
      <span className="text-xs text-red-500">
        Erro: {state.error}{" "}
        <button className="underline" onClick={() => setState(null)}>fechar</button>
      </span>
    );
  }

  if (state?.link) {
    return (
      <span className="text-xs text-orange-600 flex flex-col gap-1 max-w-xs">
        <span>{state.error}</span>
        <button className="underline text-left truncate" onClick={copyLink}>
          Copiar link de redefinição
        </button>
        <button className="text-muted-foreground underline" onClick={() => setState(null)}>fechar</button>
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      onClick={handle}
      disabled={isPending || state?.sent}
    >
      {state?.sent ? "✓ Email enviado" : isPending ? "Enviando…" : "Reset senha"}
    </Button>
  );
}
