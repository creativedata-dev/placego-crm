"use client";

import { useState, useTransition } from "react";
import { saveBrokerChannelConfig } from "../../whatsapp/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader2, Users } from "lucide-react";
import { WhatsAppConnector } from "./whatsapp-connector";
import type { CompanyChannel } from "@/db/schema";

type BrokerProvider = "same_as_contact" | "evolution" | "meta_cloud";

interface Props {
  tenantId: string;
  provider: BrokerProvider;
  metaPhoneNumberId: string;
  metaAccessToken: string;
  metaWabaId: string;
  evolutionInstance: string;
  defaultEvolutionInstance: string;
  brokerChannel: CompanyChannel | null;
}

const OPTIONS: { value: BrokerProvider; title: string; description: string }[] = [
  { value: "same_as_contact", title: "Mesmo canal do contato", description: "Usa o mesmo número/provider configurado em Recebimento para conversar com o corretor. Mistura o tráfego de SDR com o de distribuição no mesmo número." },
  { value: "evolution", title: "Evolution API — número dedicado", description: "Notifica e conversa com o corretor por um número separado do usado com o contato, via QR Code. Reduz o risco de bloqueio do número de recebimento." },
  { value: "meta_cloud", title: "Meta Cloud API", description: "Notifica e conversa com o corretor por um número Meta Cloud dedicado (API oficial)." },
];

export function BrokerChannelCard({
  tenantId, provider: initialProvider,
  metaPhoneNumberId, metaAccessToken, metaWabaId,
  evolutionInstance, defaultEvolutionInstance, brokerChannel,
}: Props) {
  const [provider, setProvider] = useState<BrokerProvider>(initialProvider);
  const [phoneId, setPhoneId] = useState(metaPhoneNumberId);
  const [token, setToken] = useState(metaAccessToken);
  const [wabaId, setWabaId] = useState(metaWabaId);
  const [instanceName, setInstanceName] = useState(evolutionInstance || defaultEvolutionInstance);
  const [instanceSaved, setInstanceSaved] = useState(!!evolutionInstance);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      const res = await saveBrokerChannelConfig(tenantId, {
        provider,
        metaPhoneNumberId: phoneId,
        metaAccessToken: token,
        metaWabaId: wabaId,
        evolutionInstance: provider === "evolution" ? instanceName : undefined,
      });
      setResult(res);
      if (res.ok && provider === "evolution") setInstanceSaved(true);
    });
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex items-start gap-2">
        <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div>
          <h2 className="font-semibold text-sm">Canal para o corretor</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Número usado para notificar e conversar com o corretor na distribuição do lead. Pode ser diferente do canal usado pelo SDR para falar com o contato.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setProvider(opt.value)}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              provider === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <p className="font-medium text-sm">{opt.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
          </button>
        ))}
      </div>

      {provider === "meta_cloud" && (
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-2">
            <Label htmlFor="brokerPhoneId">Phone Number ID *</Label>
            <Input id="brokerPhoneId" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} placeholder="123456789012345" className="h-9 text-sm font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brokerToken">Access Token (System User) *</Label>
            <Input id="brokerToken" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAAxxxxx..." className="h-9 text-sm font-mono" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brokerWabaId">WABA ID (opcional)</Label>
            <Input id="brokerWabaId" value={wabaId} onChange={(e) => setWabaId(e.target.value)} placeholder="123456789012345" className="h-9 text-sm font-mono" />
          </div>
        </div>
      )}

      {provider === "evolution" && (
        <div className="space-y-3 pt-2 border-t">
          {!instanceSaved ? (
            <div className="space-y-2">
              <Label htmlFor="brokerInstance">Nome da instância dedicada</Label>
              <Input
                id="brokerInstance"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder={defaultEvolutionInstance}
                className="h-9 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Número separado do usado para receber contatos — escaneie o QR Code depois de salvar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <code className="text-xs bg-muted px-2 py-1 rounded inline-block">{instanceName}</code>
              <WhatsAppConnector
                companyId={tenantId}
                instanceName={instanceName}
                channel={brokerChannel}
                channelType="whatsapp_broker"
              />
            </div>
          )}
        </div>
      )}

      {result && (
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          result.ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400"
        }`}>
          {result.ok ? <CheckCircle className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {result.message}
        </div>
      )}

      <Button onClick={handleSave} disabled={isPending} size="sm">
        {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {isPending ? "Salvando..." : "Salvar canal do corretor"}
      </Button>
    </div>
  );
}
