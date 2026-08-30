import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function NotificationsLoading() {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="space-y-2">
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <CardRowsSkeleton rows={6} />
    </div>
  );
}
