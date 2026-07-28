import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  getUnifiedUnreadCount,
  listUnifiedNotifications,
} from "@/lib/apt/economy/notification/unified-notifications";

export async function GET(req: NextRequest) {
  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const categoryParam = req.nextUrl.searchParams.get("category");

  const [notifications, unread] = await Promise.all([
    listUnifiedNotifications(authResult.user.id, {
      category: categoryParam === "all" ? null : categoryParam,
      limit: 80,
    }),
    getUnifiedUnreadCount(authResult.user.id),
  ]);

  return NextResponse.json({ notifications, unread });
}
