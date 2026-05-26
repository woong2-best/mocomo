export default function ChatRoomLoading() {
  return (
    <div className="flex flex-1 min-h-0 h-full animate-pulse">
      <aside className="hidden md:flex w-72 shrink-0 border-r border-border/60 flex-col">
        <div className="h-14 border-b border-border/60 bg-muted/30" />
        <div className="flex-1 p-2 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted" />
          ))}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-border/60 bg-muted/20" />
        <div className="flex-1 bg-muted/10" />
        <div className="h-16 border-t border-border/60 bg-muted/20" />
      </div>
    </div>
  );
}
