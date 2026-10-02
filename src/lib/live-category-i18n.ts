import type { LiveStreamCategory } from "@prisma/client";
import type { MessageKey } from "@/lib/i18n/message-keys";
import type { Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

const BROADCAST_CATEGORY_KEYS: Record<LiveStreamCategory, MessageKey> = {
  JUST_CHATTING: "live.category.chatting",
  GAME: "live.category.gaming",
  MUSIC: "live.category.music",
  IRL: "live.category.festival",
  LIVE: "live.category.r18",
  VIRTUAL: "live.category.all",
};

export function broadcastCategoryLabel(
  locale: Locale,
  category: LiveStreamCategory
): string {
  const key = BROADCAST_CATEGORY_KEYS[category] ?? "live.category.chatting";
  return translate(locale, key);
}
