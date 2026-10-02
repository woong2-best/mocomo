"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
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
