"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PRESETS = [
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
] as const;

interface DataPoint {
  date: string;   // "DD/MM"
  total: number;
}

interface Props {
  data: DataPoint[];
  from: string;
  to: string;
}

function toInputDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function activeDays(from: string, to: string) {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export function ContactsChart({ data, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [custom, setCustom] = useState(false);

  const navigate = useCallback(
    (f: string, t: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("from", f);
      p.set("to", t);
      router.push(`${pathname}?${p.toString()}`);
    },
    [router, pathname, searchParams]
  );

  function applyPreset(days: number) {
    setCustom(false);
    const t = new Date();
    const f = new Date(Date.now() - days * 86400000);
    navigate(toInputDate(f), toInputDate(t));
  }

  const days = activeDays(from, to);
  const activePreset = PRESETS.find((p) => p.days === days)?.days ?? null;

  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base">Contatos por dia</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} contatos no período
            </p>
          </div>

          {/* Filtros de período */}
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => applyPreset(p.days)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  !custom && activePreset === p.days
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setCustom(true)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                custom
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              Personalizado
            </button>

            {/* Date pickers — visíveis só em modo personalizado */}
            {custom && (
              <div className="flex items-center gap-1.5 mt-1 sm:mt-0">
                <input
                  type="date"
                  defaultValue={from}
                  max={to}
                  onChange={(e) => e.target.value && navigate(e.target.value, to)}
                  className="text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <input
                  type="date"
                  defaultValue={to}
                  min={from}
                  max={toInputDate(new Date())}
                  onChange={(e) => e.target.value && navigate(from, e.target.value)}
                  className="text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum contato no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.922 0 0)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "oklch(0.556 0 0)" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "oklch(0.556 0 0)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid oklch(0.922 0 0)",
                  boxShadow: "0 4px 12px oklch(0 0 0 / 0.08)",
                }}
                formatter={(v) => [v, "Contatos"]}
                labelStyle={{ fontWeight: 600, marginBottom: 2 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
