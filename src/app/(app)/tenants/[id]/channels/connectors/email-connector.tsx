"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveChannelConfig } from "@/app/actions/channels";
import type { CompanyChannel } from "@/db/schema";

interface Props {
  companyId: string;
  channel: CompanyChannel | null;
}

export function EmailConnector({ companyId, channel }: Props) {
  const config = (channel?.config as any) ?? {};
  const [address, setAddress] = useState(config.address ?? "");
  const [welcome, setWelcome] = useState(channel?.welcomeMessage ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await saveChannelConfig(
      companyId, "email",
      { address },
      { welcomeMessage: welcome }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Configure um endereço de email de recebimento via Resend Inbound.
        Emails recebidos nesse endereço viram contatos automaticamente.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Endereço de email de recebimento</Label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="contato@manaira.com.br"
          type="email"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Configure o encaminhamento no seu provedor de email para este endereço.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Resposta automática de boas-vindas</Label>
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          rows={2}
          placeholder="Olá! Recebemos seu email e entraremos em contato em breve."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving || !address}>
        {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar configurações"}
      </Button>
    </div>
  );
}
