export default function WalletLoading() {
  return (
    <div className="animate-pulse space-y-5 p-4 lg:p-6">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="h-28 rounded-2xl bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
