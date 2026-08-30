export default function MessageRoomLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col animate-pulse">
      <div className="h-14 shrink-0 border-b border-border/40 bg-muted/30" />
      <div className="flex-1 space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-12 rounded-2xl bg-muted ${i % 2 === 0 ? "w-3/4" : "w-2/3 ml-auto"}`}
          />
        ))}
      </div>
      <div className="h-16 shrink-0 border-t border-border/40 bg-muted/20" />
    </div>
  );
}
