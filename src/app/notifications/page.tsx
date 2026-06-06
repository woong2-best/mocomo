import { Suspense } from "react";
import { NotificationsListAsync } from "@/components/notifications/notifications-list-async";
import { FolkSectionTitle } from "@/components/brand/folk-decor";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
      <FolkSectionTitle icon="moon">알림</FolkSectionTitle>
      <p className="text-sm text-folk-forest/80 font-medium -mt-1">
        좋아요, 댓글, 팔로우, 쪽지, 라이브, 후원, 중고거래 등 활동 알림
      </p>

      <Suspense fallback={<CardRowsSkeleton rows={6} />}>
        <NotificationsListAsync />
      </Suspense>
    </div>
  );
}
