import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type NotificationSettings = {
  pushNotificationsEnabled: boolean;
  notifyDirectMessages: boolean;
  notifyMentionsReplies: boolean;
  notifyLikesInteractions: boolean;
  notifyGroupMessages: boolean;
};

export async function fetchNotificationSettings() {
  return apiRequest<NotificationSettings>(MobileApi.notificationSettings, { auth: true });
}

export async function saveNotificationSettings(patch: Partial<NotificationSettings>) {
  return apiRequest<NotificationSettings>(MobileApi.notificationSettings, {
    method: "PUT",
    auth: true,
    body: patch,
  });
}
