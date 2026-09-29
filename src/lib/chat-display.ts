import type { MessageAttachmentType, SupportTierLevel } from "@prisma/client";
import { lastMessagePreview } from "@/lib/chat-attachments";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/config";
import { uiText } from "@/lib/i18n/ui-text";

function dateFnsLocale(locale: Locale | string | undefined) {
  return locale === "ko" ? ko : enUS;
}

type RoomMember = {
  userId: string;
  user: {
    id: string;
    username: string;
    image: string | null;
    name?: string | null;
    supportTierSent?: SupportTierLevel;
    timeZone?: string | null;
  };
};

type RoomPreview = {
  id: string;
  type: string;
  name: string | null;
  members: RoomMember[];
  messages: {
    content: string | null;
    createdAt: Date;
    attachments?: { type: MessageAttachmentType }[];
  }[];
};

export function groupMemberDisplayNames(
  members: RoomMember[],
  currentUserId: string,
  locale: Locale | string | undefined = "ko"
): string {
  const others = members.filter((m) => m.userId !== currentUserId);
  const names = others
    .map((m) => m.user.name?.trim() || m.user.username)
    .filter(Boolean);
  if (names.length === 0) return uiText(locale, "단체 대화", "Group chat");
  if (names.length <= 3) return names.join(", ");
  const rest = names.length - 3;
  return uiText(locale, `${names.slice(0, 3).join(", ")} 외 ${rest}명`, `${names.slice(0, 3).join(", ")} +${rest} more`);
}

export function getConversationMeta(
  room: RoomPreview,
  currentUserId: string,
  locale: Locale | string | undefined = "ko"
) {
  const other = room.members.find((m) => m.userId !== currentUserId);
  const isDm = room.type === "DM";
  const isMarket = room.type === "MARKET";
  const isGroup = room.type === "GROUP";
  const typeLabel =
    room.type === "COSPLAYER_GROUP"
      ? uiText(locale, "코스어 단체방", "Cosplayer group")
      : room.type === "SOCIAL_GROUP"
        ? uiText(locale, "친목 단체방", "Social group")
        : room.type === "FANDOM"
          ? uiText(locale, "팬덤방", "Fandom room")
          : room.type;
  const displayName =
    (isMarket && room.name) ||
    room.name ||
    ((isDm || isMarket) && other
      ? other.user.name || other.user.username
      : isGroup
        ? groupMemberDisplayNames(room.members, currentUserId, locale)
        : typeLabel);
  const displayImage =
    (isDm || isGroup || isMarket) && other ? other.user.image : null;
  const otherUserId = (isDm || isMarket) && other ? other.user.id : undefined;
  const last = room.messages[0];

  return {
    displayName,
    displayImage,
    otherUserId,
    supportTierSent: isDm && other ? other.user.supportTierSent : undefined,
    profileUsername: (isDm || isMarket) && other ? other.user.username : undefined,
    otherTimeZone: isDm && other ? other.user.timeZone ?? null : null,
    memberClocks: room.members
      .filter((m) => m.userId !== currentUserId && m.user.timeZone)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name?.trim() || m.user.username,
        timeZone: m.user.timeZone as string,
      })),
    lastMessage: lastMessagePreview(last?.content, last?.attachments),
    lastMessageAt: last?.createdAt ?? null,
  };
}

export function formatChatListTime(date: Date | string | null, locale: Locale | string | undefined = "ko") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const loc = dateFnsLocale(locale);
  if (isToday(d)) return format(d, "HH:mm", { locale: loc });
  if (isYesterday(d)) return uiText(locale, "어제", "Yesterday");
  return format(d, "M.d", { locale: loc });
}

export function formatBubbleTime(date: Date | string, locale: Locale | string | undefined = "ko") {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "a h:mm", { locale: dateFnsLocale(locale) });
}

export function formatDateDivider(date: Date | string, locale: Locale | string | undefined = "ko") {
  const d = typeof date === "string" ? new Date(date) : date;
  const loc = dateFnsLocale(locale);
  if (isToday(d)) return uiText(locale, "오늘", "Today");
  if (isYesterday(d)) return uiText(locale, "어제", "Yesterday");
  if (locale === "ko") return format(d, "yyyy년 M월 d일", { locale: loc });
  return format(d, "MMM d, yyyy", { locale: loc });
}

export function shouldShowDateDivider(prev: Date | string | null, curr: Date | string) {
  if (!prev) return true;
  const p = typeof prev === "string" ? new Date(prev) : prev;
  const c = typeof curr === "string" ? new Date(curr) : curr;
  return !isSameDay(p, c);
}

export function shouldShowAvatar(
  prev: { senderId: string } | null,
  curr: { senderId: string },
  isMine: boolean
) {
  if (isMine) return false;
  return !prev || prev.senderId !== curr.senderId;
}
