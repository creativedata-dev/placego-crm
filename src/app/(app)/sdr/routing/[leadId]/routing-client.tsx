"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assignLeadToBrokers } from "@/app/actions/routing";
import type { BrokerMatch } from "@/lib/routing-engine";
import { CheckCircle, Circle, Send } from "lucide-react";

interface Props {
  leadId: string;
  brokerMatches: BrokerMatch[];
}

export function RoutingClient({ leadId, brokerMatches }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0) return;
    setLoading(true);
    await assignLeadToBrokers(leadId, Array.from(selected), notes || undefined);
  }

  const highMatch = brokerMatches.filter((b) => b.score >= 60);
  const midMatch = brokerMatches.filter((b) => b.score > 0 && b.score < 60);
  const noMatch = brokerMatches.filter((b) => b.score === 0);

  return (
    <div className="space-y-6">
      {brokerMatches.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          Nenhum corretor cadastrado. Cadastre corretores em{" "}
          <a href="/brokers" className="underline">Corretores</a>.
        </div>
      )}

      {/* Alta afinidade */}
      {highMatch.length > 0 && (
        <BrokerGroup
          title="Alta afinidade"
          color="green"
          brokers={highMatch}
          selected={selected}
          onToggle={toggle}
        />
      )}

      {/* Média afinidade */}
      {midMatch.length > 0 && (
        <BrokerGroup
          title="Afinidade parcial"
          color="yellow"
          brokers={midMatch}
          selected={selected}
          onToggle={toggle}
        />
      )}

      {/* Sem afinidade */}
      {noMatch.length > 0 && (
        <BrokerGroup
          title="Sem critérios de afinidade"
          color="gray"
          brokers={noMatch}
          selected={selected}
          onToggle={toggle}
        />
      )}

      {/* Rodapé */}
      {brokerMatches.length > 0 && (
        <div className="border rounded-lg p-4 space-y-4 bg-background sticky bottom-4 shadow-sm">
          <div className="space-y-2">
            <Label>Observação para os corretores (opcional)</Label>
            <Textarea
              placeholder="Ex: cliente tem urgência, prefere imóvel com varanda..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selected.size === 0
                ? "Selecione ao menos um corretor"
                : `${selected.size} corretor${selected.size > 1 ? "es" : ""} selecionado${selected.size > 1 ? "s" : ""}`}
            </p>
            <Button
              onClick={handleSend}
              disabled={selected.size === 0 || loading}
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Distribuindo..." : "Distribuir lead"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BrokerGroup({
  title,
  color,
  brokers,
  selected,
  onToggle,
}: {
  title: string;
  color: "green" | "yellow" | "gray";
  brokers: BrokerMatch[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const colorMap = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    gray: "text-muted-foreground",
  };

  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-semibold ${colorMap[color]}`}>{title}</h3>
      <div className="space-y-2">
        {brokers.map((b) => {
          const isSelected = selected.has(b.brokerId);
          const initials = b.brokerName
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <button
              key={b.brokerId}
              onClick={() => onToggle(b.brokerId)}
              className={`w-full text-left flex items-center gap-3 p-3 border rounded-lg transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/40"
              }`}
            >
              {/* Checkbox visual */}
              <div className="shrink-0">
                {isSelected ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground/40" />
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{b.brokerName}</span>
                  {b.creci && (
                    <span className="text-xs text-muted-foreground font-mono">{b.creci}</span>
                  )}
                  {b.tenantName && (
                    <Badge variant="secondary" className="text-xs">{b.tenantName}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {b.reasons.map((r, i) => (
                    <span
                      key={i}
                      className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <span
                  className={`text-lg font-bold ${
                    b.score >= 60
                      ? "text-green-600"
                      : b.score > 0
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {b.score}
                </span>
                <p className="text-[10px] text-muted-foreground">pts</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
