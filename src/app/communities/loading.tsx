export default function CommunitiesLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4 lg:p-6">
      <div className="h-8 w-36 rounded bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
