import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsFeedClient } from "@/components/notifications/notifications-feed-client";
import {
  getUnifiedUnreadCount,
  listUnifiedNotifications,
} from "@/lib/apt/economy/notification/unified-notifications";

export async function NotificationsListAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/notifications");

  const unreadCount = await getUnifiedUnreadCount(session.user.id);
  const rows = await listUnifiedNotifications(session.user.id, { limit: 80 });

  return (
    <NotificationsFeedClient
      initialNotifications={rows}
      initialUnread={unreadCount}
    />
  );
}
