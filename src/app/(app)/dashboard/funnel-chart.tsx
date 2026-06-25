"use client";

interface FunnelStep {
  label: string;
  value: number;
  color: string;
}

export function FunnelChart({ data }: { data: FunnelStep[] }) {
  const max = data[0]?.value ?? 1;

  return (
    <div className="space-y-3">
      {data.map((step, i) => {
        const pct = max > 0 ? Math.round((step.value / max) * 100) : 0;
        const dropoff = i > 0 && data[i - 1].value > 0
          ? Math.round((1 - step.value / data[i - 1].value) * 100)
          : null;

        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{step.label}</span>
              <div className="flex items-center gap-3">
                {dropoff !== null && dropoff > 0 && (
                  <span className="text-xs text-muted-foreground">−{dropoff}%</span>
                )}
                <span className="font-bold" style={{ color: step.color }}>
                  {step.value}
                </span>
              </div>
            </div>
            <div className="h-7 bg-muted rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: step.color,
                  opacity: 0.85,
                  minWidth: step.value > 0 ? "2%" : "0%",
                }}
              />
            </div>
          </div>
        );
      })}

      {data.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          Nenhum dado ainda.
        </p>
      )}
    </div>
  );
}
