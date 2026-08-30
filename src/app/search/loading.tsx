import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function SearchLoading() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="h-10 w-full max-w-md animate-pulse rounded-xl bg-muted" />
      <CardRowsSkeleton rows={6} />
    </div>
  );
}
