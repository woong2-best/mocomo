/** 앱 알림함 — 쪽지·통화·팔로우 등은 우편/다른 화면으로 두고 여기만 올린다. */
export const APP_ALARM_TYPES = [
  "comment",
  "comment_reply",
  "qna_answer",
  "like",
  "quote",
  "repost",
  "live",
  "listing_like",
] as const;

export function isAppAlarmType(type: string): boolean {
  if (type.startsWith("used_auction_")) return true;
  return (APP_ALARM_TYPES as readonly string[]).includes(type);
}

export function appAlarmNotificationWhere(userId: string) {
  return {
    userId,
    OR: [
      { type: { in: [...APP_ALARM_TYPES] } },
      { type: { startsWith: "used_auction_" } },
    ],
  };
}
