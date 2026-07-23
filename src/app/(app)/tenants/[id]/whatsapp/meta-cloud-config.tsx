"use client";

import { useState, useTransition } from "react";
import { saveMetaCloudConfig } from "./actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader2, Info } from "lucide-react";

interface Props {
  tenantId: string;
  provider: "evolution" | "meta_cloud";
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
}

export function MetaCloudConfig({ tenantId, provider: initialProvider, metaPhoneNumberId, metaAccessToken, metaWabaId }: Props) {
  const [provider, setProvider] = useState(initialProvider);
  const [phoneId, setPhoneId] = useState(metaPhoneNumberId);
  const [token, setToken] = useState(metaAccessToken);
  const [wabaId, setWabaId] = useState(metaWabaId);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      const res = await saveMetaCloudConfig(tenantId, {
        provider,
        metaPhoneNumberId: phoneId,
        metaAccessToken: token,
        metaWabaId: wabaId,
      });
      setResult(res);
    });
  }

  const inputClass = "h-9 text-sm font-mono";

  return (
    <div className="border rounded-lg p-6 space-y-6">
      <div>
        <h2 className="font-semibold text-lg">Provedor de WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha como o CRM enviará notificações WhatsApp para os corretores desta empresa.
        </p>
      </div>

      {/* Toggle de provedor */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setProvider("evolution")}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
            provider === "evolution"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
          <p className="font-semibold text-sm">Evolution API</p>
          <p className="text-xs text-muted-foreground mt-1">QR Code · Número pessoal ou chip dedicado</p>
          <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
            provider === "evolution" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {provider === "evolution" ? "Ativo" : "Selecionar"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setProvider("meta_cloud")}
          className={`p-4 rounded-xl border-2 text-left transition-colors ${
            provider === "meta_cloud"
              ? "border-green-500 bg-green-50 dark:bg-green-950/20"
              : "border-border hover:border-muted-foreground/40"
          }`}
        >
          <p className="font-semibold text-sm">Meta Cloud API</p>
          <p className="text-xs text-muted-foreground mt-1">API oficial · Número verificado no Meta</p>
          <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
            provider === "meta_cloud"
              ? "bg-green-600 text-white"
              : "bg-muted text-muted-foreground"
          }`}>
            {provider === "meta_cloud" ? "Ativo" : "Selecionar"}
          </span>
        </button>
      </div>

      {/* Configuração Meta Cloud */}
      {provider === "meta_cloud" && (
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 text-xs">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Como obter as credenciais:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700 dark:text-blue-400">
                <li>Acesse <strong>Meta for Developers → seu app → WhatsApp → API Setup</strong></li>
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
            <p className="text-xs text-muted-foreground">Encontrado em Meta for Developers → WhatsApp → API Setup</p>
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
            <p className="text-xs text-muted-foreground">Token permanente gerado no Business Manager → System Users</p>
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
            <p className="text-xs text-muted-foreground">WhatsApp Business Account ID — para referência</p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {result && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          result.ok
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
            : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
        }`}>
          {result.ok
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <XCircle className="h-4 w-4 shrink-0" />}
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
