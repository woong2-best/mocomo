import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiUser } from "@/lib/api-post-auth";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "@/lib/notifications";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  const categoryParam = req.nextUrl.searchParams.get("category");
  const types =
    categoryParam &&
    categoryParam !== "all" &&
    categoryParam in NOTIFICATION_CATEGORIES
      ? Array.from(NOTIFICATION_CATEGORIES[categoryParam as NotificationCategory])
      : null;

  const where = {
    userId: authResult.user.id,
    ...(types ? { type: { in: types } } : {}),
  };

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        actor: { select: userPublicSelectMinimal },
      },
    }),
    db.notification.count({
      where: { userId: authResult.user.id, read: false },
    }),
  ]);

  return NextResponse.json({ notifications, unread });
}
