export function PostCommentsSkeleton() {
  return (
    <section id="comments" className="space-y-4 animate-pulse">
      <div className="h-6 w-24 bg-muted rounded" />
      <div className="h-20 bg-muted/60 rounded-xl" />
      <div className="h-16 bg-muted/50 rounded-xl" />
      <div className="h-16 bg-muted/50 rounded-xl" />
    </section>
  );
}
