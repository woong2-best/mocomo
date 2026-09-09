export default function MessagesLoading() {
  return (
    <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 p-8 animate-pulse min-h-0">
      <div className="h-12 w-12 rounded-full bg-muted" />
      <div className="h-4 w-40 rounded bg-muted" />
    </div>
  );
}
