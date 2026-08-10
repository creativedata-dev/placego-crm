"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  userId: string;
  userName: string;
}

export function SendNotificationButton({ userId, userName }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | "no_sub" | null>(null);

  async function handleSend() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: "📢 PlaceGo CRM", body: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setResult("error");
      else if (data.sent === 0) setResult("no_sub");
      else setResult("ok");
    } catch {
      setResult("error");
    }
    setLoading(false);
  }

  function handleClose() {
    setOpen(false);
    setText("");
    setResult(null);
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen(true)} title="Enviar notificação">
        <Bell className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Enviar notificação para {userName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResult(null); }}
              placeholder="Digite a mensagem..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
              autoFocus
            />

            {result === "ok" && (
              <p className="text-xs text-green-600 font-medium">✓ Notificação enviada com sucesso</p>
            )}
            {result === "no_sub" && (
              <p className="text-xs text-amber-600">⚠ Usuário ainda não ativou as notificações no dispositivo</p>
            )}
            {result === "error" && (
              <p className="text-xs text-destructive">✗ Erro ao enviar — tente novamente</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSend} disabled={loading || !text.trim()}>
              {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Enviando...</> : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
