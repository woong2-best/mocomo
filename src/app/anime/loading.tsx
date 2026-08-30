export default function AnimeLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4 lg:p-6">
      <div className="h-8 w-24 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[3/4] rounded-xl bg-muted" />
            <div className="h-3.5 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
