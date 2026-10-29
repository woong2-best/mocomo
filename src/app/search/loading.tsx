import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 lg:border-x lg:border-border/70">
      <div className="flex border-b border-border/80">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 py-3.5">
            <div className="mx-auto h-3.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <CardRowsSkeleton rows={6} />
    </div>
  );
}
