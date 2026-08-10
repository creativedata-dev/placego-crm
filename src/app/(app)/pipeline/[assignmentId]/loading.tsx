export default function Loading() {
  return (
    <div className="max-w-5xl space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-8 w-48 bg-muted rounded-md" />
            <div className="h-5 w-20 bg-muted rounded-full" />
            <div className="h-5 w-24 bg-muted rounded-full" />
          </div>
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
        <div className="h-8 w-20 bg-muted rounded-md shrink-0" />
      </div>

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversa skeleton */}
        <div className="lg:col-span-2 space-y-3">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="rounded-xl border bg-muted/20 h-64 space-y-3 p-4">
            <div className="flex justify-end"><div className="h-8 w-48 bg-green-100 rounded-xl" /></div>
            <div className="flex"><div className="h-8 w-40 bg-muted rounded-xl" /></div>
            <div className="flex justify-end"><div className="h-12 w-56 bg-green-100 rounded-xl" /></div>
            <div className="flex"><div className="h-8 w-36 bg-muted rounded-xl" /></div>
          </div>
          <div className="rounded-xl border bg-muted/10 h-28" />
        </div>

        {/* Painel lateral skeleton */}
        <div className="space-y-4">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="flex gap-2 flex-wrap">
              {[...Array(5)].map((_, i) => <div key={i} className="h-7 w-16 bg-muted rounded-full" />)}
            </div>
            <div className="h-20 bg-muted/30 rounded-md" />
            <div className="h-8 w-16 bg-muted rounded-md ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
