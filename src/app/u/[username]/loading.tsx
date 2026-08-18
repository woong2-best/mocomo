export default function ProfileLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-48 bg-muted/40" />
      <div className="border-b border-border/40 px-4 py-3 flex gap-4">
        <div className="h-4 w-12 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
      <div className="space-y-3 p-4">
        <div className="h-28 rounded-2xl bg-muted" />
        <div className="h-28 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
