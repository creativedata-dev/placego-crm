export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-36 bg-muted rounded-lg" />
      <div className="flex gap-2 flex-wrap">
        {[1,2,3,4].map((i) => <div key={i} className="h-9 w-32 bg-muted rounded-lg" />)}
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="h-10 bg-muted/50 border-b" />
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-0">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-4 w-24 bg-muted/60 rounded" />
            <div className="h-4 w-20 bg-muted/60 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
