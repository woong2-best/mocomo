import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";

type RoomMember = {
  userId: string;
  user: { id: string; username: string; image: string | null; name?: string | null };
};

type RoomPreview = {
  id: string;
  type: string;
  name: string | null;
  members: RoomMember[];
  messages: { content: string | null; createdAt: Date }[];
};

export function getConversationMeta(room: RoomPreview, currentUserId: string) {
  const other = room.members.find((m) => m.userId !== currentUserId);
  const isDm = room.type === "DM";
  const displayName =
    room.name || (isDm && other ? other.user.name || other.user.username : room.type);
  const displayImage = isDm && other ? other.user.image : null;
  const otherUserId = isDm && other ? other.user.id : undefined;
  const last = room.messages[0];

  return {
    displayName,
    displayImage,
    otherUserId,
    profileUsername: isDm && other ? other.user.username : undefined,
    lastMessage: last?.content?.trim() || "대화를 시작해 보세요",
    lastMessageAt: last?.createdAt ?? null,
  };
}

export function formatChatListTime(date: Date | string | null) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return format(d, "HH:mm", { locale: ko });
  if (isYesterday(d)) return "어제";
  return format(d, "M.d", { locale: ko });
}

export function formatBubbleTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "a h:mm", { locale: ko });
}

export function formatDateDivider(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "오늘";
  if (isYesterday(d)) return "어제";
  return format(d, "yyyy년 M월 d일", { locale: ko });
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
