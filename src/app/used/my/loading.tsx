import { UsedMySkeleton } from "@/components/used/used-loading-skeletons";

export default function UsedMyLoading() {
  return (
    <div className="py-4 space-y-4 max-w-lg mx-auto">
      <div className="h-4 w-28 rounded bg-muted animate-pulse" />
      <div className="h-7 w-40 rounded-lg bg-muted animate-pulse" />
      <UsedMySkeleton />
    </div>
  );
}
