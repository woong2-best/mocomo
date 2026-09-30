import { db } from "@/lib/db";
import { blockedIdList, filterOutBlockedUserIds, getBlockedUserIdSet } from "@/lib/user-block";
import {
  aptNotificationCategory,
  type AptNotificationType,
} from "./apt-notification-types";
import type { NotificationRow } from "@/lib/notification-display";
import { notificationCategoryForType } from "@/lib/notification-display";
import {
  countAptUnread,
  listAptNotifications,
  markAllAptNotificationsRead,
  markAptNotificationRead,
  RETENTION_DAYS,
} from "./notification-service";

const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function socialRetentionSince() {
  return new Date(Date.now() - RETENTION_MS);
}

function aptToRow(n: {
  id: string;
  type: string;
  title: string;
  body: string;
  payload: unknown;
  isRead: boolean;
  createdAt: Date;
}): NotificationRow {
  const payload = (n.payload ?? {}) as { href?: string };
  return {
    id: n.id,
    source: "apt",
    type: n.type,
    title: n.title,
    body: n.body,
    link: payload.href ?? null,
    read: n.isRead,
    createdAt: n.createdAt.toISOString(),
    actor: null,
  };
}

export async function getUnifiedUnreadCount(userId: string): Promise<number> {
  const blocked = blockedIdList(await getBlockedUserIdSet(userId));
  const socialWhere = {
    userId,
    read: false,
    ...(blocked.length
      ? { OR: [{ actorId: null }, { actorId: { notIn: blocked } }] }
      : {}),
  };
  const [social, apt] = await Promise.all([
    db.notification.count({ where: socialWhere }),
    countAptUnread(userId),
  ]);
  return social + apt;
}

export async function listUnifiedNotifications(
  userId: string,
  options?: { category?: string | null; limit?: number }
): Promise<NotificationRow[]> {
  const limit = options?.limit ?? 80;
  const blocked = await getBlockedUserIdSet(userId);
  const excludeActors = blockedIdList(blocked);

  const [social, apt] = await Promise.all([
    db.notification.findMany({
      where: {
        userId,
        createdAt: { gte: socialRetentionSince() },
        ...(excludeActors.length
          ? { OR: [{ actorId: null }, { actorId: { notIn: excludeActors } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { id: true, username: true, image: true } } },
    }),
    listAptNotifications(userId, { limit }),
  ]);

  const socialVisible = filterOutBlockedUserIds(social, blocked, (n) => n.actorId ?? "");

  let rows: NotificationRow[] = [
    ...socialVisible.map((n) => ({
      id: n.id,
      source: "social" as const,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor,
    })),
    ...apt.map(aptToRow),
  ];

  if (options?.category && options.category !== "all") {
    if (options.category === "economy") {
      rows = rows.filter((r) => r.source === "apt");
    } else if (options.category === "social") {
      rows = rows.filter((r) => r.source !== "apt");
    } else {
      rows = rows.filter((r) => {
        if (r.source === "apt") {
          return aptNotificationCategory(r.type) === options.category;
        }
        return notificationCategoryForType(r.type) === options.category;
      });
    }
  }

  rows.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return rows.slice(0, limit);
}

export async function markUnifiedNotificationRead(
  userId: string,
  id: string,
  source: "social" | "apt"
): Promise<void> {
  if (source === "apt") {
    await markAptNotificationRead(userId, id);
    return;
  }
  await db.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export async function markAllUnifiedNotificationsRead(userId: string): Promise<void> {
  await Promise.all([
    db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    }),
    markAllAptNotificationsRead(userId),
  ]);
}

export function typesForEconomyCategory(category: string): AptNotificationType[] | null {
  const map: Record<string, AptNotificationType[]> = {
    market: ["MARKET_SOLD", "MARKET_PURCHASE", "MARKET_EXPIRED", "MARKET_CANCELLED", "FLEA_ITEM_SOLD"],
    shop: ["SHOP_PURCHASE", "SHOP_SOLD_OUT", "SHOP_FEATURED_REFRESH"],
    flea: ["FLEA_STARTED", "FLEA_ENDING", "FLEA_ITEM_SOLD"],
    live: ["LIVE_REWARD", "LIVE_DAILY_LIMIT"],
    mission: ["MISSION_REWARD"],
    fraud: ["FRAUD_WARN", "FRAUD_WATCH", "FRAUD_FREEZE", "FRAUD_UNFREEZE"],
    system: ["ADMIN_NOTICE", "SYSTEM"],
    economy: [],
  };
  if (category === "economy") return null;
  return map[category] ?? null;
}
