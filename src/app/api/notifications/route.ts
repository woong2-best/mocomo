import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import { getNotificationCounts, listNotifications } from "@/lib/notification-feed";

export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const categoryParam = req.nextUrl.searchParams.get("category");

  const [notifications, counts] = await Promise.all([
    listNotifications(authResult.user.id, {
      category: categoryParam === "all" ? null : categoryParam,
      limit: 80,
    }),
    getNotificationCounts(authResult.user.id),
  ]);

  return NextResponse.json({
    notifications,
    unread: counts.unread,
    badge: counts.badge,
  });
}
