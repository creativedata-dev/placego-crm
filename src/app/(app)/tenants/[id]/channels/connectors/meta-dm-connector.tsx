"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveChannelConfig } from "@/app/actions/channels";
import type { CompanyChannel } from "@/db/schema";

interface Props {
  companyId: string;
  channelType: string;
  channel: CompanyChannel | null;
  label: string;
  placeholder: string;
}

export function MetaDmConnector({ companyId, channelType, channel, label, placeholder }: Props) {
  const config = (channel?.config as any) ?? {};
  const [pageId, setPageId] = useState(config.page_id ?? "");
  const [accessToken, setAccessToken] = useState(config.access_token ?? "");
  const [welcome, setWelcome] = useState(channel?.welcomeMessage ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await saveChannelConfig(
      companyId, channelType,
      { page_id: pageId, access_token: accessToken },
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
        Para receber DMs do {label}, conecte a página via App Meta PlaceGo CRM
        e insira o Page ID e o token de acesso permanente abaixo.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Page ID</Label>
          <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Ex: 111222333444" className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Access Token</Label>
          <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="EAAxxxxxx..." type="password" className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Resposta automática de boas-vindas</Label>
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          rows={2}
          placeholder={`Olá! Obrigado por entrar em contato pelo ${label}. Em breve retornaremos!`}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving || (!pageId && !accessToken)}>
        {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar configurações"}
      </Button>
    </div>
  );
}
