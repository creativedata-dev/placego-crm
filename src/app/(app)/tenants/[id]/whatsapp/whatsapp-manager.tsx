"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createEvolutionInstance, deleteEvolutionInstance } from "@/app/actions/evolution";
import { Smartphone, QrCode, Trash2, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props {
  tenantId: string;
  tenantName: string;
  instanceName: string;
}

export function WhatsAppManager({ tenantId, tenantName, instanceName }: Props) {
  const [status, setStatus] = useState<"unknown" | "connecting" | "connected" | "disconnected">("unknown");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  // Poll QR code até conectar
  useEffect(() => {
    if (status !== "connecting") return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [status]);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/evolution/status?instance=${instanceName}`);
      if (!res.ok) { setStatus("disconnected"); setLoading(false); return; }
      const data = await res.json();
      if (data.state === "open") {
        setStatus("connected");
        setQrCode(null);
      } else if (data.qrcode) {
        setStatus("connecting");
        setQrCode(data.qrcode);
      } else {
        setStatus("disconnected");
      }
    } catch {
      setStatus("disconnected");
    }
    setLoading(false);
  }

  function handleCreate() {
    startTransition(async () => {
      await createEvolutionInstance(instanceName);
      setStatus("connecting");
      // Busca QR code
      setTimeout(async () => {
        const res = await fetch(`/api/evolution/status?instance=${instanceName}`);
        if (res.ok) {
          const data = await res.json();
          if (data.qrcode) setQrCode(data.qrcode);
        }
      }, 2000);
    });
  }

  function handleDelete() {
    if (!confirm(`Desconectar WhatsApp de "${tenantName}"? Os corretores deixarão de receber notificações.`)) return;
    startTransition(async () => {
      await deleteEvolutionInstance(instanceName);
      setStatus("disconnected");
      setQrCode(null);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Verificando conexão...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex items-center gap-3">
        <Smartphone className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-sm font-medium">Instância: <code className="text-xs bg-muted px-1 rounded">{instanceName}</code></p>
        </div>
        <Badge variant={status === "connected" ? "default" : status === "connecting" ? "secondary" : "outline"}>
          {status === "connected" && <CheckCircle className="h-3 w-3 mr-1" />}
          {status === "connecting" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          {status === "disconnected" && <XCircle className="h-3 w-3 mr-1" />}
          {status === "connected" ? "Conectado" : status === "connecting" ? "Aguardando QR" : "Desconectado"}
        </Badge>
      </div>

      {/* QR Code */}
      {status === "connecting" && qrCode && (
        <div className="flex flex-col items-center gap-3 p-6 border-2 border-dashed rounded-xl">
          <p className="text-sm font-medium">Escaneie o QR Code com o WhatsApp da empresa</p>
          <img src={qrCode} alt="QR Code WhatsApp" className="w-56 h-56 rounded-lg" />
          <p className="text-xs text-muted-foreground text-center">
            WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho
          </p>
          <Button variant="outline" size="sm" onClick={checkStatus} disabled={isPending}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar status
          </Button>
        </div>
      )}

      {/* Conectado */}
      {status === "connected" && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">WhatsApp conectado</p>
            <p className="text-xs text-green-700">Corretores receberão notificações de novos leads por este número.</p>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-1">
        {status === "disconnected" && (
          <Button onClick={handleCreate} disabled={isPending}>
            <QrCode className="h-4 w-4 mr-2" />
            {isPending ? "Criando instância..." : "Conectar WhatsApp"}
          </Button>
        )}
        {status === "connecting" && !qrCode && (
          <Button onClick={checkStatus} variant="outline" disabled={isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Buscar QR Code
          </Button>
        )}
        {(status === "connected" || status === "connecting") && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={isPending}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Desconectar
          </Button>
        )}
      </div>
    </div>
  );
}
