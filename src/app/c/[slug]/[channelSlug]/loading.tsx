export default function CommunityChannelLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 p-4 gap-3 animate-pulse">
      <div className="h-8 w-40 rounded-md bg-muted" />
      <div className="flex-1 rounded-xl bg-muted/50" />
    </div>
  );
}
