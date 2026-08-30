export default function MessagesLoading() {
  return (
    <div className="flex h-full min-h-0 animate-pulse">
      <div className="hidden sm:flex w-72 shrink-0 flex-col border-r border-border/40">
        <div className="h-14 border-b border-border/40 bg-muted/30" />
        <div className="flex-1 space-y-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-xl p-2">
              <div className="h-11 w-11 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3.5 w-24 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
      </div>
    </div>
  );
}
