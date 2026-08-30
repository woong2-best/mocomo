export default function MarketItemLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="aspect-square rounded-2xl bg-muted" />
        <div className="space-y-4">
          <div className="h-7 w-4/5 rounded bg-muted" />
          <div className="h-8 w-28 rounded bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-12 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
