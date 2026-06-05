export default function AuthLoading() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 animate-pulse">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 space-y-4">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-muted" />
        <div className="h-6 w-32 mx-auto rounded bg-muted" />
        <div className="h-10 rounded-xl bg-muted" />
        <div className="h-10 rounded-xl bg-muted" />
        <div className="h-11 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
