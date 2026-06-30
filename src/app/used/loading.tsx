import { UsedFeedSkeleton } from "@/components/used/used-loading-skeletons";

export default function UsedLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 rounded-xl bg-muted animate-moco-shimmer" />
      <UsedFeedSkeleton />
    </div>
  );
}
