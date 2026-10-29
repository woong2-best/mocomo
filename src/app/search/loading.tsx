import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function SearchLoading() {
  return (
    <div className="mx-auto w-full max-w-[600px] pt-2">
      <div className="flex w-full border-b border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 py-4">
            <div className="mx-auto h-3.5 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="pt-4">
        <CardRowsSkeleton rows={6} />
      </div>
    </div>
  );
}
