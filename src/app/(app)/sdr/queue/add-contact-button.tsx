"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
} from "@/components/ui/select";
import { createContact } from "@/app/actions/contacts";
import { Plus } from "lucide-react";

interface Props {
  tenants: { id: string; name: string }[];
}

const ORIGINS = [
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "meta_dm_instagram", label: "📸 Instagram DM" },
  { value: "meta_dm_facebook", label: "📘 Facebook DM" },
  { value: "email", label: "✉️ Email" },
  { value: "indicacao", label: "🤝 Indicação" },
  { value: "meta_leadgen", label: "📋 Lead Ads (Meta)" },
  { value: "lp", label: "🌐 Landing Page" },
  { value: "portal", label: "🏠 Portal (Zap, Viva Real)" },
  { value: "manual", label: "📝 Cadastro manual" },
];

export function AddContactButton({ tenants }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await createContact(formData);
    setOpen(false);
    setLoading(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Novo contato
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar contato</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input id="phone" name="phone" required placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="email@exemplo.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Origem do contato *</Label>
              <select
                id="origin"
                name="origin"
                defaultValue="whatsapp"
                required
                className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
              >
                {ORIGINS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {tenants.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="tenantId">Empresa (opcional)</Label>
                <select
                  id="tenantId"
                  name="tenantId"
                  className="w-full h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
                >
                  <option value="">Nenhuma empresa vinculada</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes" name="notes" rows={2}
                placeholder="Interesse mencionado, imóvel, contexto do contato..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Cadastrar e distribuir"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
