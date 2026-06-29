import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function GamesLiveLoading() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="h-8 w-36 rounded-lg bg-muted animate-pulse" />
      <CardRowsSkeleton rows={5} />
    </div>
  );
}
