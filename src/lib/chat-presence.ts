/** 채팅 접속 표시 — 소켓 연결 기준 (실시간) */

export const CHAT_PRESENCE_RING_CLASS =
  "ring-2 ring-folk-cobalt ring-offset-2 ring-offset-background";

export type RoomPresencePayload = {
  onlineUserIds: string[];
};

export type PresenceChangePayload = {
  userId: string;
  online: boolean;
  roomId?: string;
};
