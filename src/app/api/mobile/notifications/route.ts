import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { appAlarmNotificationWhere } from "@/lib/app-alarm";
import { db } from "@/lib/db";
import { blockedIdList, filterOutBlockedUserIds, getBlockedUserIdSet } from "@/lib/user-block";

export async function GET(req: NextRequest) {
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const userId = authResult.user.id;
  const blocked = await getBlockedUserIdSet(userId);
  const excludeActors = blockedIdList(blocked);
  const where = {
    ...appAlarmNotificationWhere(userId),
    ...(excludeActors.length
      ? { OR: [{ actorId: null }, { actorId: { notIn: excludeActors } }] }
      : {}),
  };
  const [rows, unreadRaw, user] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { actor: { select: { id: true, username: true, image: true } } },
    }),
    db.notification.count({ where: { ...where, read: false } }),
    db.user.findUnique({
      where: { id: userId },
      select: { notificationsLastSeenAt: true },
    }),
  ]);
  const visibleRows = filterOutBlockedUserIds(rows, blocked, (n) => n.actorId ?? "");
  const unread = blocked.size
    ? visibleRows.filter((n) => !n.read).length
    : unreadRaw;
  const lastSeen = user?.notificationsLastSeenAt;
  const badge = !lastSeen
    ? unread
    : await db.notification.count({
        where: { ...where, read: false, createdAt: { gt: lastSeen } },
      });

  return NextResponse.json({
    notifications: visibleRows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      actor: n.actor,
    })),
    unread,
    badge,
  });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-notifications-read", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const body = (await req.json().catch(() => ({}))) as {
    id?: unknown;
    all?: unknown;
    seen?: unknown;
  };
  const where = appAlarmNotificationWhere(authResult.user.id);

  if (body.seen === true) {
    await db.user.update({
      where: { id: authResult.user.id },
      data: { notificationsLastSeenAt: new Date() },
    });
  } else if (body.all === true) {
    await db.notification.updateMany({
      where: { ...where, read: false },
      data: { read: true },
    });
  } else if (typeof body.id === "string" && body.id.length > 0 && body.id.length <= 64) {
    await db.notification.updateMany({
      where: { ...where, id: body.id },
      data: { read: true },
    });
  } else {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [unread, user] = await Promise.all([
    db.notification.count({ where: { ...where, read: false } }),
    db.user.findUnique({
      where: { id: authResult.user.id },
      select: { notificationsLastSeenAt: true },
    }),
  ]);
  const lastSeen = user?.notificationsLastSeenAt;
  const badge = lastSeen
    ? await db.notification.count({
        where: { ...where, read: false, createdAt: { gt: lastSeen } },
      })
    : unread;
  return NextResponse.json({ ok: true, unread, badge });
}
