"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateContactData } from "@/app/actions/leads";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  contactId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export function ContactEditForm({ contactId, name, phone, email, notes }: Props) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ name, phone: phone ?? "", email: email ?? "", notes: notes ?? "" });
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setValues({ name, phone: phone ?? "", email: email ?? "", notes: notes ?? "" });
    setEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateContactData(contactId, {
        name: values.name || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        notes: values.notes || undefined,
      });
      setEditing(false);
    });
  }

  const inputClass = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring/50";

  if (!editing) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Dados do contato</h3>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-3 w-3 mr-1" /> Editar
          </Button>
        </div>
        {phone && <Row label="Telefone" value={phone} />}
        {email && <Row label="Email" value={email} />}
        {notes && <Row label="Obs" value={notes} />}
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Dados do contato</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={handleCancel} disabled={isPending}>
            <X className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-600 hover:text-green-600" onClick={handleSave} disabled={isPending}>
            <Check className="h-3 w-3 mr-1" /> {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">Nome</label>
          <input className={inputClass} value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Telefone</label>
          <input className={inputClass} value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} placeholder="+55 11 99999-9999" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input className={inputClass} value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} placeholder="email@exemplo.com" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Observações</label>
          <textarea className={inputClass + " resize-none"} rows={2} value={values.notes} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} placeholder="Anotações internas..." />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-16 shrink-0">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  );
}
