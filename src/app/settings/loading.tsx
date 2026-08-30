export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-5 p-4 lg:p-6 max-w-2xl">
      <div className="h-8 w-24 rounded bg-muted" />
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
