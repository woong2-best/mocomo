export default function MarketLoading() {
  return (
    <div className="animate-pulse space-y-5 p-4">
      <div className="h-8 w-40 rounded bg-muted" />
      <div className="h-10 w-full rounded-xl bg-muted" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
