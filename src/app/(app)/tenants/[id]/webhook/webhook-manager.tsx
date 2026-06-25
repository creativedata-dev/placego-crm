"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateWebhookToken, revokeWebhookToken } from "@/app/actions/tenants";
import { Copy, Check, RefreshCw, Trash2, Zap } from "lucide-react";

interface Props {
  tenantId: string;
  tenantName: string;
  currentToken: string | null;
  webhookUrl: string | null;
}

export function WebhookManager({ tenantId, tenantName, currentToken, webhookUrl }: Props) {
  const [copied, setCopied] = useState<"url" | "token" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localToken, setLocalToken] = useState(currentToken);
  const [localUrl, setLocalUrl] = useState(webhookUrl);

  function copy(text: string, type: "url" | "token") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  function handleGenerate() {
    startTransition(async () => {
      const token = await generateWebhookToken(tenantId);
      const appUrl = window.location.origin;
      setLocalToken(token);
      setLocalUrl(`${appUrl}/api/leads/capture?token=${token}`);
    });
  }

  function handleRevoke() {
    if (!confirm(`Revogar o token de "${tenantName}"? O webhook vai parar de funcionar imediatamente.`)) return;
    startTransition(async () => {
      await revokeWebhookToken(tenantId);
      setLocalToken(null);
      setLocalUrl(null);
    });
  }

  if (!localToken) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 border-2 border-dashed rounded-lg text-center">
        <Zap className="h-8 w-8 text-muted-foreground/40" />
        <div>
          <p className="font-medium">Nenhum webhook configurado</p>
          <p className="text-sm text-muted-foreground">Gere um token para ativar a integração</p>
        </div>
        <Button onClick={handleGenerate} disabled={isPending}>
          {isPending ? "Gerando..." : "Gerar token de webhook"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* URL do webhook */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">URL do Webhook</label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={localUrl ?? ""}
            className="font-mono text-xs bg-muted"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(localUrl!, "url")}
            className="shrink-0"
          >
            {copied === "url" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Token de verificação */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Token de verificação</label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={localToken}
            className="font-mono text-xs bg-muted"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => copy(localToken, "token")}
            className="shrink-0"
          >
            {copied === "token" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Use este mesmo valor no campo "Token de verificação" do Meta.
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isPending}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          {isPending ? "Regenerando..." : "Regenerar token"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleRevoke}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Revogar
        </Button>
      </div>
    </div>
  );
}
