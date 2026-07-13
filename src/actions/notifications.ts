"use server";

import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  markAllUnifiedNotificationsRead,
  markUnifiedNotificationRead,
} from "@/lib/apt/economy/notification/unified-notifications";
import { deleteAllAptNotifications } from "@/lib/apt/economy/notification/notification-service";

export async function markNotificationRead(id: string, source: "social" | "apt" = "social") {
  const user = await requireAuth({ writeKind: "notification" });
  await markUnifiedNotificationRead(user.id, id, source);
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const user = await requireAuth({ writeKind: "notification" });
  await markAllUnifiedNotificationsRead(user.id);
  revalidatePath("/notifications");
}

export async function deleteAllEconomyNotificationsAction() {
  const user = await requireAuth({ writeKind: "notification" });
  const count = await deleteAllAptNotifications(user.id);
  revalidatePath("/notifications");
  return { count };
}
