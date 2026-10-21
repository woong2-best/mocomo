"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/lib/notification-settings";

const schema = z
  .object({
    pushNotificationsEnabled: z.boolean().optional(),
    notifyDirectMessages: z.boolean().optional(),
    notifyMentionsReplies: z.boolean().optional(),
    notifyLikesInteractions: z.boolean().optional(),
    notifyGroupMessages: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.pushNotificationsEnabled !== undefined ||
      value.notifyDirectMessages !== undefined ||
      value.notifyMentionsReplies !== undefined ||
      value.notifyLikesInteractions !== undefined ||
      value.notifyGroupMessages !== undefined,
    { message: "actions.slqeo1f" }
  );

export async function loadNotificationSettings(): Promise<NotificationSettings | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getNotificationSettings(session.user.id);
}

export async function updateNotificationSettings(
  data: Partial<NotificationSettings>
): Promise<{ settings: NotificationSettings } | { error: string }> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "actions.slqeo1f" };

  const session = await auth();
  if (!session?.user?.id) return { error: "common.error.authRequired" };

  const settings = await saveNotificationSettings(session.user.id, parsed.data);
  return { settings };
}
