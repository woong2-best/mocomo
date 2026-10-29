export default function ProfileSettingsLoading() {
  return (
    <div className="animate-pulse space-y-5 p-4 lg:p-6 max-w-2xl">
      <div className="h-4 w-24 rounded bg-muted" />

      <div className="overflow-hidden rounded-2xl">
        <div className="h-28 sm:h-32 bg-muted" />
        <div className="flex items-end gap-3 px-4 pb-4 -mt-10">
          <div className="h-20 w-20 rounded-full bg-muted ring-4 ring-background" />
          <div className="space-y-2 pb-1">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="h-20 rounded-2xl bg-muted" />
      <div className="h-20 rounded-2xl bg-muted" />

      <div className="space-y-3 rounded-2xl p-1">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
