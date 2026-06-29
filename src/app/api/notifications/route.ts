import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import {
  getUnifiedUnreadCount,
  listUnifiedNotifications,
} from "@/lib/apt/economy/notification/unified-notifications";

export async function GET(req: NextRequest) {
  const authResult = await requireApiUser();
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
