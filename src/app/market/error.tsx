"use client";

export default function MarketError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <div className="p-6 space-y-2">
      <p className="font-extrabold">Market failed to load.</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {error.digest ? <p className="text-xs text-muted-foreground">digest {error.digest}</p> : null}
    </div>
  );
}
