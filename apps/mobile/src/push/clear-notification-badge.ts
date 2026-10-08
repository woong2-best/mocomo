import * as Notifications from "expo-notifications";

/** Home-screen / tray badges stay until we clear them after the user opens the inbox or a push. */
export async function clearNotificationBadges(): Promise<void> {
  await Promise.all([
    Notifications.setBadgeCountAsync(0).catch(() => undefined),
    Notifications.dismissAllNotificationsAsync().catch(() => undefined),
  ]);
}
