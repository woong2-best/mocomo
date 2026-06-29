import { Suspense } from "react";
import { NotificationsListAsync } from "@/components/notifications/notifications-list-async";
import { NotificationsPageChrome } from "@/components/notifications/notifications-page-chrome";
import { CardRowsSkeleton } from "@/components/ui/content-skeletons";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <NotificationsPageChrome>
      <Suspense fallback={<CardRowsSkeleton rows={6} />}>
        <NotificationsListAsync />
      </Suspense>
    </NotificationsPageChrome>
  );
}
