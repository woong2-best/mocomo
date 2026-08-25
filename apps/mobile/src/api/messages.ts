import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type DmInboxRoom = {
  id: string;
  type: string;
  displayName: string;
  displayImage: string | null;
  otherUserId: string | null;
  profileUsername: string | null;
  lastMessage: string;
  lastMessageAt: string | null;
};

export type ChatAttachment = {
  id: string;
  url: string;
  type: string;
  name: string | null;
};

export type ChatReplyTo = {
  id: string;
  content: string | null;
  sender: {
    id: string;
    username: string;
    image: string | null;
  };
  attachments?: ChatAttachment[];
};

export type ChatMessage = {
  id: string;
  content: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    image: string | null;
  };
  attachments: ChatAttachment[];
  replyTo?: ChatReplyTo;
};

export type DmRoomPayload = {
  room: {
    id: string;
    type: string;
    displayName: string;
    displayImage: string | null;
    otherUserId: string | null;
    profileUsername: string | null;
  };
  messages: ChatMessage[];
  nextBefore: string | null;
};

export async function fetchDmInbox() {
  return apiRequest<{ rooms: DmInboxRoom[] }>(MobileApi.messages, { auth: true });
}

export async function openDm(userId: string) {
  return apiRequest<{ roomId: string }>(`${MobileApi.messages}/dm`, {
    method: "POST",
    body: { userId },
  });
}

export async function fetchRoomMessages(roomId: string, before?: string | null) {
  const q = new URLSearchParams();
  if (before) q.set("before", before);
  q.set("limit", "40");
  const suffix = q.toString() ? `?${q}` : "";
  return apiRequest<DmRoomPayload>(`${MobileApi.messages}/${roomId}${suffix}`, { auth: true });
}

export async function sendRoomMessage(
  roomId: string,
  body: {
    content?: string;
    replyToId?: string;
    attachments?: { url: string; type: "IMAGE" | "VIDEO" | "AUDIO" | "GIF"; name?: string }[];
  }
) {
  return apiRequest<{ message: ChatMessage }>(`${MobileApi.messages}/${roomId}`, {
    method: "POST",
    body,
  });
}

export type PostShareCard = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  author: {
    username: string;
    name: string | null;
    image: string | null;
    displayName: string;
  };
  media: { url: string; type: string; posterUrl: string | null } | null;
  href: string;
};

export async function fetchPostShareCard(postId: string) {
  return apiRequest<{ ok: boolean; post?: PostShareCard }>(
    MobileApi.postShareCard(postId),
    { auth: true }
  );
}

export async function searchMessageUsers(q: string) {
  const query = new URLSearchParams({ q });
  return apiRequest<{
    users: { id: string; username: string; name: string | null; image: string | null }[];
  }>(`${MobileApi.search}?${query}`, { auth: true });
}

export async function syncRoomMessages(roomId: string, after?: string | null) {
  const q = new URLSearchParams();
  if (after) q.set("after", after);
  const suffix = q.toString() ? `?${q}` : "";
  return apiRequest<{ messages: ChatMessage[] }>(
    `${MobileApi.messages}/${roomId}/sync${suffix}`,
    { auth: true }
  );
}

export async function waitRoomMessages(roomId: string, after?: string | null, signal?: AbortSignal) {
  const q = new URLSearchParams();
  if (after) q.set("after", after);
  const suffix = q.toString() ? `?${q}` : "";
  return apiRequest<{ messages: ChatMessage[] }>(
    `${MobileApi.messages}/${roomId}/wait${suffix}`,
    { auth: true, signal, timeoutMs: 12_000 }
  );
}
