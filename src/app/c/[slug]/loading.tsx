export default function CommunityLoading() {
  return (
    <div className="flex h-full min-h-0 animate-pulse">
      <div className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border/40 bg-muted/20">
        <div className="h-14 border-b border-border/40 bg-muted/30" />
        <div className="flex-1 space-y-2 p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="h-10 w-48 rounded bg-muted mb-4" />
        <div className="flex-1 rounded-xl bg-muted/60" />
      </div>
    </div>
  );
}
