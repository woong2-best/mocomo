import { Suspense } from "react";
import { NotificationsListAsync } from "@/components/notifications/notifications-list-async";
import { NotificationsSettingsLink } from "@/components/notifications/notifications-settings-link";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <AppPageChrome maxWidth="2xl" spacing="sm">
      <NativePageTitle>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">알림</h1>
            <p className="text-sm text-muted-foreground mt-1">
              좋아요, 댓글, 팔로우, 쪽지, 라이브, 후원, 중고거래 등 활동 알림
            </p>
          </div>
          <NotificationsSettingsLink className="hidden lg:inline-flex shrink-0 mt-1" />
        </div>
      </NativePageTitle>

      <Suspense fallback={<CardRowsSkeleton rows={6} />}>
        <NotificationsListAsync />
      </Suspense>
    </AppPageChrome>
  );
}
