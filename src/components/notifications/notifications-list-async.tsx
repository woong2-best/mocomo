import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { NotificationsFeedClient } from "@/components/notifications/notifications-feed-client";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import type { NotificationRow } from "@/lib/notification-display";

export async function NotificationsListAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/notifications");

  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      actor: { select: userPublicSelectMinimal },
    },
  });

  const rows: NotificationRow[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: true,
    createdAt: n.createdAt.toISOString(),
    actor: n.actor,
  }));

  return (
    <NotificationsFeedClient
      initialNotifications={rows}
      initialUnread={0}
    />
  );
}

