import { Suspense } from "react";
import { NotificationsListAsync } from "@/components/notifications/notifications-list-async";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <NativePageTitle>
        <h1 className="text-2xl font-bold">알림</h1>
        <p className="text-sm text-muted-foreground mt-1">
          좋아요, 댓글, 팔로우, 쪽지, 라이브, 후원, 중고거래 등 활동 알림
        </p>
      </NativePageTitle>

      <Suspense fallback={<CardRowsSkeleton rows={6} />}>
        <NotificationsListAsync />
      </Suspense>
    </AppPageChrome>
  );
}
