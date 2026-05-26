import { Suspense } from "react";
import { Bell } from "lucide-react";
import {
  NotificationsListAsync,
  NotificationsUnreadBadgeAsync,
} from "@/components/notifications/notifications-list-async";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export default function NotificationsPage() {
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          알림
          <Suspense fallback={null}>
            <NotificationsUnreadBadgeAsync />
          </Suspense>
        </h1>
      </div>

      <Suspense fallback={<CardRowsSkeleton rows={6} />}>
        <NotificationsListAsync />
      </Suspense>
    </div>
  );
}
