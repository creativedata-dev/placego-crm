"use client";

import { useState, useTransition } from "react";
import { saveMetaCloudConfig } from "../../whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader2, Info } from "lucide-react";

interface Props {
  tenantId: string;
  currentProvider: "evolution" | "meta_cloud";
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  metaVerifyToken: string;
  metaAutoWelcome: boolean;
}

export function MetaCloudProviderCard({
  tenantId,
  currentProvider,
  metaPhoneNumberId,
  metaAccessToken,
  metaWabaId,
  metaVerifyToken,
  metaAutoWelcome: initialAutoWelcome,
}: Props) {
  const [phoneId, setPhoneId] = useState(metaPhoneNumberId);
  const [token, setToken] = useState(metaAccessToken);
  const [wabaId, setWabaId] = useState(metaWabaId);
  const [verifyToken, setVerifyToken] = useState(metaVerifyToken);
  const [autoWelcome, setAutoWelcome] = useState(initialAutoWelcome);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      const res = await saveMetaCloudConfig(tenantId, {
        provider: "meta_cloud",
        metaPhoneNumberId: phoneId,
        metaAccessToken: token,
        metaWabaId: wabaId,
        metaVerifyToken: verifyToken,
        metaAutoWelcome: autoWelcome,
      });
      setResult(res);
    });
  }

  const inputClass = "h-9 text-sm font-mono";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-800 text-xs">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Como obter as credenciais:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-700">
            <li>Meta for Developers → seu app → WhatsApp → API Setup</li>
            <li>Copie o <strong>Phone Number ID</strong> do número verificado</li>
            <li>Gere um <strong>System User Token permanente</strong> no Business Manager</li>
            <li>O <strong>WABA ID</strong> está em WhatsApp → Configuration</li>
          </ol>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phoneId">Phone Number ID *</Label>
        <Input
          id="phoneId"
          value={phoneId}
          onChange={(e) => setPhoneId(e.target.value)}
          placeholder="123456789012345"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">Meta for Developers → WhatsApp → API Setup</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="token">Access Token (System User) *</Label>
        <Input
          id="token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="EAAxxxxx..."
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">Business Manager → System Users → Gerar novo token</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wabaId">WABA ID (opcional)</Label>
        <Input
          id="wabaId"
          value={wabaId}
          onChange={(e) => setWabaId(e.target.value)}
          placeholder="123456789012345"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">WhatsApp Business Account ID</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verifyToken">Webhook Verify Token</Label>
        <Input
          id="verifyToken"
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value)}
          placeholder="token-secreto-para-verificacao"
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">
          URL do webhook: <span className="font-mono">https://crm.placego.com.br/api/meta/webhook</span>
        </p>
      </div>

      <div className="flex items-start gap-3 pt-2 border-t">
        <button
          type="button"
          role="switch"
          aria-checked={autoWelcome}
          onClick={() => setAutoWelcome((v) => !v)}
          className={`relative mt-0.5 shrink-0 h-5 w-9 rounded-full transition-colors ${
            autoWelcome ? "bg-green-500" : "bg-muted-foreground/30"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              autoWelcome ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        <div>
          <p className="text-sm font-medium">Template de boas-vindas automático</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ao receber novo contato, dispara <span className="font-mono">template_reativacao</span> abrindo a janela de 24h.
          </p>
        </div>
      </div>

      {result && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          result.ok
            ? "bg-emerald-50 text-emerald-700"
            : "bg-red-50 text-red-700"
        }`}>
          {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {result.message}
        </div>
      )}

      <Button onClick={handleSave} disabled={isPending} size="sm">
        {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {isPending ? "Salvando..." : "Salvar configuração"}
      </Button>
    </div>
  );
}
