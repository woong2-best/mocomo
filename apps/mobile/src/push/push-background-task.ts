import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import {
  POST_INTERACTION_CATEGORY,
  registerAllNotificationCategories,
} from "@/push/notification-categories";
import {
  handlePostNotificationAction,
  isPostActionIdentifier,
  notificationDataFromResponse,
} from "@/push/notification-action-handler";

export const BACKGROUND_NOTIFICATION_TASK = "MOCOMO_BACKGROUND_NOTIFICATION";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseRemoteNotificationData(
  payload: Notifications.NotificationTaskPayload
): Record<string, unknown> {
  if ("actionIdentifier" in payload) return {};

  const remote = payload as {
    data?: { dataString?: string; [key: string]: unknown };
  };
  const raw = remote.data ?? {};
  if (typeof raw.dataString === "string") {
    try {
      return { ...raw, ...(JSON.parse(raw.dataString) as Record<string, unknown>) };
    } catch {
      return asRecord(raw);
    }
  }
  return asRecord(raw);
}

async function presentAndroidPostNotification(data: Record<string, unknown>): Promise<void> {
  const title = typeof data.title === "string" ? data.title : "MoCoMo";
  const body =
    typeof data.preview === "string"
      ? data.preview
      : typeof data.body === "string"
        ? data.body
        : "";
  const imageUrl = typeof data.imageUrl === "string" ? data.imageUrl : undefined;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      categoryIdentifier: POST_INTERACTION_CATEGORY,
      ...(imageUrl
        ? {
            attachments: [{ identifier: "thumb", url: imageUrl, type: "image" as const }],
          }
        : {}),
    },
    trigger: null,
  });
}

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) return;

  const payload = data as Notifications.NotificationTaskPayload | undefined;
  if (!payload) return;

  if ("actionIdentifier" in payload) {
    const actionIdentifier = payload.actionIdentifier;
    if (!isPostActionIdentifier(actionIdentifier)) return;

    const response = payload as Notifications.NotificationResponse;
    await handlePostNotificationAction(notificationDataFromResponse(response));
    return;
  }

  const remote = parseRemoteNotificationData(payload);
  if (remote.categoryId === POST_INTERACTION_CATEGORY) {
    await registerAllNotificationCategories();
    await presentAndroidPostNotification(remote);
  }
});

export async function registerBackgroundNotificationTask(): Promise<void> {
  await registerAllNotificationCategories();
  const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
  if (!registered) {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  }
}
