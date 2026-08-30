export default function AnimeDetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-48 sm:h-64 bg-muted/50" />
      <div className="space-y-4 p-4 lg:p-6 max-w-4xl mx-auto">
        <div className="h-8 w-2/3 rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-full bg-muted" />
          <div className="h-6 w-20 rounded-full bg-muted" />
        </div>
        <div className="h-32 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
