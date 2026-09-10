export default function UsedLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4 lg:p-6">
      <div className="h-8 w-28 rounded bg-muted" />
      <div className="h-10 w-full rounded-xl bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
