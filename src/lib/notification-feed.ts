import { db } from "@/lib/db";
import { blockedIdList, filterOutBlockedUserIds, getBlockedUserIdSet } from "@/lib/user-block";
import type { NotificationRow } from "@/lib/notification-display";
import { notificationCategoryForType } from "@/lib/notification-display";

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function unreadWhere(
  userId: string,
  blocked: string[],
  createdAfter?: Date | null
) {
  return {
    userId,
    read: false,
    ...(createdAfter ? { createdAt: { gt: createdAfter } } : {}),
    ...(blocked.length ? { OR: [{ actorId: null }, { actorId: { notIn: blocked } }] } : {}),
  };
}

export async function getNotificationUnreadCount(userId: string): Promise<number> {
  const blocked = blockedIdList(await getBlockedUserIdSet(userId));
  return db.notification.count({ where: unreadWhere(userId, blocked) });
}

export async function getNotificationCounts(
  userId: string
): Promise<{ unread: number; badge: number }> {
  const [blocked, user] = await Promise.all([
    getBlockedUserIdSet(userId).then(blockedIdList),
    db.user.findUnique({
      where: { id: userId },
      select: { notificationsLastSeenAt: true },
    }),
  ]);
  const lastSeen = user?.notificationsLastSeenAt ?? null;
  if (!lastSeen) {
    const unread = await db.notification.count({ where: unreadWhere(userId, blocked) });
    return { unread, badge: unread };
  }
  const [unread, badge] = await Promise.all([
    db.notification.count({ where: unreadWhere(userId, blocked) }),
    db.notification.count({ where: unreadWhere(userId, blocked, lastSeen) }),
  ]);
  return { unread, badge };
}

export async function markNotificationsSeenForUser(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { notificationsLastSeenAt: new Date() },
  });
}

export async function listNotifications(
  userId: string,
  options?: { category?: string | null; limit?: number }
): Promise<NotificationRow[]> {
  const limit = options?.limit ?? 80;
  const blocked = await getBlockedUserIdSet(userId);
  const excludeActors = blockedIdList(blocked);

  const social = await db.notification.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - RETENTION_MS) },
      ...(excludeActors.length
        ? { OR: [{ actorId: null }, { actorId: { notIn: excludeActors } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { id: true, username: true, image: true } } },
  });

  let rows: NotificationRow[] = filterOutBlockedUserIds(social, blocked, (n) => n.actorId ?? "").map(
    (n) => ({
      id: n.id,
      source: "social" as const,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor,
    })
  );

  const category = options?.category;
  if (category && category !== "all" && category !== "social") {
    rows = rows.filter((r) => notificationCategoryForType(r.type) === category);
  }
  return rows;
}

export async function markNotificationReadForUser(userId: string, id: string): Promise<void> {
  await db.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllNotificationsReadForUser(userId: string): Promise<void> {
  await db.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
