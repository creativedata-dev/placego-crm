export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-muted rounded-lg" />
      <div className="h-4 w-64 bg-muted/60 rounded" />
      <div className="flex gap-2">
        {[1,2,3].map((i) => <div key={i} className="h-8 w-24 bg-muted rounded-full" />)}
      </div>
      {[1,2,3].map((i) => (
        <div key={i} className="border rounded-xl overflow-hidden">
          <div className="h-12 bg-muted/40 px-4 flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
            <div className="ml-auto h-5 w-6 bg-muted-foreground/20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
