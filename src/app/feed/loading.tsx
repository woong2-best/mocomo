export default function FeedLoading() {
  return (
    <div className="space-y-3 animate-pulse px-4 lg:px-6 py-4">
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 rounded-xl bg-muted" />
        <div className="h-24 rounded-xl bg-muted" />
      </div>
      <div className="h-32 rounded-2xl bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
    </div>
  );
}
