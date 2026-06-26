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

export function CommentConnector({ companyId, channel }: Props) {
  const config = (channel?.config as any) ?? {};
  const [pageId, setPageId] = useState(config.page_id ?? "");
  const [keywords, setKeywords] = useState((channel?.keywords ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    const kwList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    await saveChannelConfig(
      companyId, "meta_comment",
      { page_id: pageId },
      { keywords: kwList }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputClass = "w-full h-8 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/50";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Captura comentários em posts e anúncios que contenham as palavras-chave configuradas.
        Requer permissão <code className="bg-muted px-1 rounded">pages_manage_engagement</code> no App Meta.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs">Page ID</Label>
        <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Ex: 111222333444" className={inputClass} />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Palavras-chave de interesse</Label>
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="interesse, quero, informações, preço, valor, contato"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          Separadas por vírgula. Comentários sem essas palavras são ignorados.
        </p>
      </div>

      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar configurações"}
      </Button>
    </div>
  );
}
