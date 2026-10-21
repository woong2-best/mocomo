import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import {
  getNotificationCounts,
  listNotifications,
  markNotificationReadForUser,
  markNotificationsSeenForUser,
} from "@/lib/notification-feed";

export async function GET(req: NextRequest) {
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const userId = authResult.user.id;
  const [notifications, counts] = await Promise.all([
    listNotifications(userId, { limit: 80 }),
    getNotificationCounts(userId),
  ]);

  return NextResponse.json({
    notifications,
    unread: counts.unread,
    badge: counts.badge,
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
  const userId = authResult.user.id;

  if (body.seen === true) {
    await markNotificationsSeenForUser(userId);
  } else if (body.all === true) {
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  } else if (typeof body.id === "string" && body.id.length > 0 && body.id.length <= 64) {
    await markNotificationReadForUser(userId, body.id);
  } else {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const counts = await getNotificationCounts(userId);
  return NextResponse.json({ ok: true, unread: counts.unread, badge: counts.badge });
}
