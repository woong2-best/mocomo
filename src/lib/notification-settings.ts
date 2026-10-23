import { db } from "@/lib/db";

export type NotificationSettings = {
  pushNotificationsEnabled: boolean;
  notifyDirectMessages: boolean;
  notifyMentionsReplies: boolean;
  notifyLikesInteractions: boolean;
  notifyGroupMessages: boolean;
};

const SELECT = {
  pushNotificationsEnabled: true,
  notifyDirectMessages: true,
  notifyMentionsReplies: true,
  notifyLikesInteractions: true,
  notifyGroupMessages: true,
} as const;

const DEFAULTS: NotificationSettings = {
  pushNotificationsEnabled: true,
  notifyDirectMessages: true,
  notifyMentionsReplies: true,
  notifyLikesInteractions: true,
  notifyGroupMessages: true,
};

export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: SELECT,
  });
  if (!user) return DEFAULTS;
  return user;
}

export async function saveNotificationSettings(
  userId: string,
  patch: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const data: Partial<NotificationSettings> = {};
  if (patch.pushNotificationsEnabled !== undefined) {
    data.pushNotificationsEnabled = patch.pushNotificationsEnabled;
  }
  if (patch.notifyDirectMessages !== undefined) {
    data.notifyDirectMessages = patch.notifyDirectMessages;
  }
  if (patch.notifyMentionsReplies !== undefined) {
    data.notifyMentionsReplies = patch.notifyMentionsReplies;
  }
  if (patch.notifyLikesInteractions !== undefined) {
    data.notifyLikesInteractions = patch.notifyLikesInteractions;
  }
  if (patch.notifyGroupMessages !== undefined) {
    data.notifyGroupMessages = patch.notifyGroupMessages;
  }
  if (Object.keys(data).length === 0) return getNotificationSettings(userId);

  return db.user.update({
    where: { id: userId },
    data,
    select: SELECT,
  });
}

/** Whether a mobile push should be delivered for this in-app notification type. */
export function pushAllowedForNotificationType(
  settings: NotificationSettings,
  type: string | undefined
): boolean {
  if (!settings.pushNotificationsEnabled) return false;
  if (!type) return true;

  if (type === "dm" || type === "call") return settings.notifyDirectMessages;
  if (type === "dm_group") return settings.notifyGroupMessages;

  if (
    [
      "mention",
      "comment",
      "comment_reply",
      "quote",
      "qna_answer",
      "qna_answer_accepted",
      "comment_pin",
      "clip_comment",
    ].includes(type)
  ) {
    return settings.notifyMentionsReplies;
  }

  if (
    [
      "like",
      "listing_like",
      "repost",
      "clip_like",
      "comment_like",
      "comment_author_like",
      "vote",
    ].includes(type)
  ) {
    return settings.notifyLikesInteractions;
  }

  return true;
}
