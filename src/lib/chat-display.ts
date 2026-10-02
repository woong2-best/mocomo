import type { MessageAttachmentType, SupportTierLevel } from "@prisma/client";
import { lastMessagePreview } from "@/lib/chat-attachments";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

function dateFnsLocale(_locale: Locale | string | undefined) {
  return enUS;
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
  _locale: Locale | string | undefined = "en"
): string {
  const others = members.filter((m) => m.userId !== currentUserId);
  const names = others
    .map((m) => m.user.name?.trim() || m.user.username)
    .filter(Boolean);
  if (names.length === 0) return t("ui.group_chat");
  if (names.length <= 3) return names.join(", ");
  const rest = names.length - 3;
  return t("chat.groupMembersOverflow", {
    names: names.slice(0, 3).join(", "),
    rest: String(rest),
  });
}

export function getConversationMeta(
  room: RoomPreview,
  currentUserId: string,
  locale: Locale | string | undefined = "en"
) {
  const other = room.members.find((m) => m.userId !== currentUserId);
  const isDm = room.type === "DM";
  const isMarket = room.type === "MARKET";
  const isGroup = room.type === "GROUP";
  const typeLabel =
    room.type === "COSPLAYER_GROUP"
      ? t("ui.cosplayer_group")
      : room.type === "SOCIAL_GROUP"
        ? t("ui.social_group")
        : room.type === "FANDOM"
          ? t("ui.fandom_room")
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

export function formatChatListTime(date: Date | string | null, locale: Locale | string | undefined = "en") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const loc = dateFnsLocale(locale);
  if (isToday(d)) return format(d, "HH:mm", { locale: loc });
  if (isYesterday(d)) return t("ui.yesterday");
  return format(d, "M.d", { locale: loc });
}

export function formatBubbleTime(date: Date | string, locale: Locale | string | undefined = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "a h:mm", { locale: dateFnsLocale(locale) });
}

export function formatDateDivider(date: Date | string, locale: Locale | string | undefined = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  const loc = dateFnsLocale(locale);
  if (isToday(d)) return t("calendar.today");
  if (isYesterday(d)) return t("ui.yesterday");
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
