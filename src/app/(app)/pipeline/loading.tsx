export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-32 bg-muted rounded-lg" />
      <div className="h-4 w-52 bg-muted/60 rounded" />
      {[1,2,3,4].map((i) => (
        <div key={i} className="border rounded-xl overflow-hidden">
          <div className="h-12 bg-muted/40 px-4 flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <div className="h-4 w-28 bg-muted-foreground/20 rounded" />
            <div className="ml-auto h-5 w-6 bg-muted-foreground/20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
