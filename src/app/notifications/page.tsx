import { Suspense } from "react";
import { Bell } from "lucide-react";
import { NotificationsListAsync } from "@/components/notifications/notifications-list-async";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          알림
        </h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        좋아요, 댓글, 팔로우, 쪽지, 라이브, 후원, 중고거래 등 활동 알림
      </p>

      <Suspense fallback={<CardRowsSkeleton rows={6} />}>
        <NotificationsListAsync />
      </Suspense>
    </div>
  );
}
