"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addActivity } from "@/app/actions/pipeline";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, MapPin, StickyNote } from "lucide-react";

const TYPES = [
  { value: "note", label: "Nota", icon: StickyNote },
  { value: "call", label: "Ligação", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "visit", label: "Visita", icon: MapPin },
];

export function NoteForm({ assignmentId }: { assignmentId: string }) {
  const [type, setType] = useState("note");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;
    const fd = new FormData();
    fd.set("assignmentId", assignmentId);
    fd.set("type", type);
    fd.set("notes", notes.trim());
    startTransition(async () => {
      await addActivity(fd);
      setNotes("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border p-4 space-y-3">
      <h2 className="text-sm font-semibold">Registrar atividade</h2>

      {/* Seletor de tipo */}
      <div className="flex gap-1.5 flex-wrap">
        {TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              type === value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        placeholder={
          type === "note" ? "Escreva uma observação sobre o lead..."
          : type === "call" ? "Como foi a ligação?"
          : type === "whatsapp" ? "O que foi conversado?"
          : type === "email" ? "Assunto e resumo do email..."
          : "Como foi a visita?"
        }
        className="resize-none"
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !notes.trim()}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
