import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function SearchLoading() {
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div className="h-10 rounded-xl bg-muted animate-pulse" />
      <CardRowsSkeleton rows={6} />
    </div>
  );
}
