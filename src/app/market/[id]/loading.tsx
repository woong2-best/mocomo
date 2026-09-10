export default function UsedDetailLoading() {
  return (
    <div className="animate-pulse space-y-4 p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="aspect-square max-h-[420px] w-full rounded-2xl bg-muted" />
      <div className="h-7 w-3/4 rounded bg-muted" />
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
      </div>
    </div>
  );
}
