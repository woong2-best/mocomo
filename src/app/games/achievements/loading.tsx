import { GridCardsSkeleton } from "@/components/ui/content-skeletons";

export default function GamesAchievementsLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="h-8 w-24 rounded-lg bg-muted animate-pulse" />
      <GridCardsSkeleton count={4} />
    </div>
  );
}
