"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createEvolutionInstance, deleteEvolutionInstance } from "@/app/actions/evolution";
import { saveChannelConfig } from "@/app/actions/channels";
import { QrCode, Trash2, RefreshCw, CheckCircle, Loader2 } from "lucide-react";
import type { CompanyChannel } from "@/db/schema";

interface Props {
  companyId: string;
  instanceName: string;
  channel: CompanyChannel | null;
}

export function WhatsAppConnector({ companyId, instanceName, channel }: Props) {
  const [status, setStatus] = useState<"unknown" | "connecting" | "connected" | "disconnected">("unknown");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [welcome, setWelcome] = useState((channel?.welcomeMessage as string) ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { checkStatus(); }, []);

  useEffect(() => {
    if (status !== "connecting") return;
    const t = setInterval(checkStatus, 5000);
    return () => clearInterval(t);
  }, [status]);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/evolution/status?instance=${instanceName}`);
      if (!res.ok) { setStatus("disconnected"); setLoading(false); return; }
      const data = await res.json();
      if (data.state === "open") { setStatus("connected"); setQrCode(null); }
      else if (data.qrcode) { setStatus("connecting"); setQrCode(data.qrcode); }
      else setStatus("disconnected");
    } catch { setStatus("disconnected"); }
    setLoading(false);
  }

  async function handleConnect() {
    setLoading(true);
    await createEvolutionInstance(instanceName);
    await saveChannelConfig(companyId, "whatsapp", { instanceName });
    setStatus("connecting");
    setTimeout(checkStatus, 2000);
  }

  async function handleDisconnect() {
    if (!confirm("Desconectar WhatsApp?")) return;
    await deleteEvolutionInstance(instanceName);
    setStatus("disconnected");
    setQrCode(null);
  }

  async function handleSave() {
    setSaving(true);
    await saveChannelConfig(companyId, "whatsapp", { instanceName }, { welcomeMessage: welcome });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3">
        <code className="text-xs bg-muted px-2 py-1 rounded">{instanceName}</code>
        {status === "connected" && (
          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Conectado
          </span>
        )}
        {status === "connecting" && (
          <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Aguardando QR
          </span>
        )}
        {status === "disconnected" && (
          <span className="text-xs text-muted-foreground">Desconectado</span>
        )}
      </div>

      {/* QR Code */}
      {status === "connecting" && qrCode && (
        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed rounded-xl">
          <p className="text-sm font-medium">Escaneie com o WhatsApp da empresa</p>
          <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-lg" />
          <p className="text-xs text-muted-foreground text-center">
            WhatsApp → Configurações → Aparelhos conectados
          </p>
          <Button variant="outline" size="sm" onClick={checkStatus}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
          </Button>
        </div>
      )}

      {/* Mensagem de boas-vindas — sempre visível */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mensagem de boas-vindas (opcional)</Label>
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          rows={3}
          placeholder="Olá! Recebemos sua mensagem. Em breve um consultor entrará em contato."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50 resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Enviada automaticamente para quem entrar em contato pelo WhatsApp pela primeira vez.
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 flex-wrap">
        {status === "disconnected" && (
          <Button size="sm" onClick={handleConnect}>
            <QrCode className="h-3.5 w-3.5 mr-1.5" /> Conectar WhatsApp
          </Button>
        )}
        <Button size="sm" variant={status === "disconnected" ? "outline" : "default"} onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
        {(status === "connected" || status === "connecting") && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDisconnect}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Desconectar
          </Button>
        )}
        {status === "connecting" && !qrCode && (
          <Button size="sm" variant="outline" onClick={checkStatus}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Buscar QR
          </Button>
        )}
      </div>
    </div>
  );
}
