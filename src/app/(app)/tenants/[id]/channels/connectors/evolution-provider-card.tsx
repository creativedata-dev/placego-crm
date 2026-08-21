"use client";

import { useState, useTransition } from "react";
import { saveMetaCloudConfig } from "../../whatsapp/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props {
  tenantId: string;
  currentProvider: "evolution" | "meta_cloud";
}

/** Painel compacto para ativar Evolution API como provedor de notificações */
export function EvolutionProviderCard({ tenantId, currentProvider }: Props) {
  const isActive = currentProvider === "evolution";
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleActivate() {
    setResult(null);
    startTransition(async () => {
      const res = await saveMetaCloudConfig(tenantId, {
        provider: "evolution",
        metaPhoneNumberId: "",
        metaAccessToken: "",
        metaWabaId: "",
      });
      setResult(res);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Usa a instância Evolution API desta empresa para enviar notificações WhatsApp aos corretores quando um lead é distribuído.
      </p>

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

      {!isActive && (
        <Button size="sm" onClick={handleActivate} disabled={isPending}>
          {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Ativar Evolution API como provedor
        </Button>
      )}

      {isActive && !result && (
        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
          <CheckCircle className="h-3.5 w-3.5" /> Evolution API ativa como provedor de notificações
        </p>
      )}
    </div>
  );
}
