import { sendFcmToUser, isFcmConfigured } from "@/lib/fcm-push";
import {
  getNotificationSettings,
  pushAllowedForNotificationType,
} from "@/lib/notification-settings";

export type MobilePushInput = {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
  /** FCM data payload (roomId, callId, postId, categoryId, etc.) */
  data?: Record<string, string>;
};

/** Native app FCM only — web push is intentionally disabled. */
export async function deliverMobilePush(input: MobilePushInput): Promise<void> {
  if (!isFcmConfigured()) return;

  const settings = await getNotificationSettings(input.userId);
  if (!pushAllowedForNotificationType(settings, input.type)) return;

  await sendFcmToUser({
    userId: input.userId,
    title: input.title,
    body: input.body,
    url: input.url,
    tag: input.tag,
    type: input.type,
    data: input.data,
  });
}

export function isAnyPushConfigured(): boolean {
  return isFcmConfigured();
}
