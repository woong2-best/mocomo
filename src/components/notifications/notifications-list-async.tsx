import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationsFeedClient } from "@/components/notifications/notifications-feed-client";
import { getNotificationUnreadCount, listNotifications } from "@/lib/notification-feed";

export async function NotificationsListAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/notifications");

  const [unreadCount, rows] = await Promise.all([
    getNotificationUnreadCount(session.user.id),
    listNotifications(session.user.id, { limit: 80 }),
  ]);

  return (
    <NotificationsFeedClient
      initialNotifications={rows}
      initialUnread={unreadCount}
    />
  );
}
