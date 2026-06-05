export default function ComposeLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 animate-pulse space-y-4">
      <div className="h-8 w-24 rounded-lg bg-muted" />
      <div className="h-40 rounded-2xl bg-muted" />
      <div className="h-10 rounded-xl bg-muted" />
      <div className="h-48 rounded-xl bg-muted" />
      <div className="h-11 rounded-xl bg-muted" />
    </div>
  );
}
