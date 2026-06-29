import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function GamesRankingLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="h-8 w-40 rounded-lg bg-muted animate-pulse" />
      <div className="h-10 w-48 rounded-lg bg-muted animate-pulse" />
      <CardRowsSkeleton rows={8} />
    </div>
  );
}
