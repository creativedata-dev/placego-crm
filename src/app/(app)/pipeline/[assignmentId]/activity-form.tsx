"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addActivity } from "@/app/actions/pipeline";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function ActivityForm({ assignmentId }: { assignmentId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("call");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("assignmentId", assignmentId);
    fd.set("type", type);
    fd.set("notes", notes);
    startTransition(async () => {
      await addActivity(fd);
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5 mr-1.5" /> Registrar atividade
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Nova atividade</h2>

      <div className="space-y-1.5">
        <Label>Tipo</Label>
        <Select value={type} onValueChange={(v) => v && setType(v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="call">📞 Ligação</SelectItem>
            <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
            <SelectItem value="email">✉️ Email</SelectItem>
            <SelectItem value="visit">📍 Visita</SelectItem>
            <SelectItem value="note">📝 Anotação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="O que aconteceu?" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>Salvar</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
