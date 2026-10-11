"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  markNotificationsSeenForUser,
} from "@/lib/notification-feed";

export async function markNotificationRead(id: string) {
  const user = await requireAuth({ writeKind: "notification" });
  await markNotificationReadForUser(user.id, id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireAuth({ writeKind: "notification" });
  await markAllNotificationsReadForUser(user.id);
  revalidatePath("/notifications");
}

/** 알림 페이지 방문 — 헤더 뱃지만 끄고 개별 알림 read는 유지 */
export async function markNotificationsSeenAction() {
  const user = await requireAuth({ writeKind: "notification" });
  await markNotificationsSeenForUser(user.id);
}
