"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { toggleChannel } from "@/app/actions/channels";
import type { CompanyChannel } from "@/db/schema";

interface Props {
  icon: string;
  title: string;
  description: string;
  channel: CompanyChannel | null;
  companyId: string;
  channelType: string;
  webhookUrl?: string;
  webhookToken?: string | null;
  tenantId?: string;
  tenantName?: string;
  children: React.ReactNode;
}

export function ChannelCard({
  icon, title, description, channel, companyId, channelType, children,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isActive = channel?.isActive ?? false;

  function handleToggle() {
    startTransition(() => toggleChannel(companyId, channelType, !isActive));
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isActive ? "border-primary/30 bg-primary/2" : "border-border"}`}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{title}</span>
            {isActive ? (
              <Badge className="text-xs bg-green-500/10 text-green-700 border-green-200 hover:bg-green-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-1.5" />
                Inativo
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
          >
            {expanded ? "Fechar ▲" : "Configurar ▼"}
          </button>

          {/* Toggle ativo/inativo */}
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              isActive ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              isActive ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </button>
        </div>
      </div>

      {/* Configurações expandidas */}
      {expanded && (
        <div className="border-t bg-muted/30 p-4">
          {children}
        </div>
      )}
    </div>
  );
}
