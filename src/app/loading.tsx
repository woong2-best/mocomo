export default function RootLoading() {
  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-40 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
