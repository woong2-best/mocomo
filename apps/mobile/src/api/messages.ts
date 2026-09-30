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
  unread?: boolean;
};

export type ChatAttachment = {
  id: string;
  url: string;
  type: string;
  name: string | null;
  priceKrw?: number;
  locked?: boolean;
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

export type UsedListingChatCard = {
  id: string;
  title: string;
  imageUrl: string | null;
  priceLabel: string;
  saleType: string;
  href: string;
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
  /** Present when the message is a used-listing inquiry card. */
  usedListing?: UsedListingChatCard | null;
};

export type ChatRoomMember = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  timeZone?: string | null;
};

export type DirectTradeView = {
  id: string;
  listingId: string;
  roomId: string;
  listingTitle: string;
  sellerUsername: string;
  counterpartUsername: string;
  priceLabel: string;
  meetPlace: string | null;
  meetAt: string | null;
  proposedMeetAt: string | null;
  proposedByMe: boolean;
  tradeStatus: string;
  tradeStatusLabel: string;
  myArrivalStatus: string;
  myArrivalLabel: string;
  counterpartArrivalStatus: string;
  counterpartArrivalLabel: string;
  disputeStatus: string;
  disputeStatusLabel: string;
  depositStatus: string;
  depositStatusLabel: string;
  penaltyStatus: string;
  penaltyStatusLabel: string;
  guidance: string | null;
  myPin: string | null;
  pinWarning: string | null;
  canVerifyArrival: boolean;
  canReportNoShow: boolean;
  canSubmitPin: boolean;
  canProposeMeet: boolean;
  canAcceptMeet: boolean;
  canAdjustMeet: boolean;
  role: "buyer" | "seller";
};

export type UsedTradeRoomContext = {
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  saleType?: string;
  priceLabel?: string;
  sellerUsername?: string;
  sellerId: string;
  buyerId: string;
  isBuyer: boolean;
  isSeller: boolean;
  canRequestTrade: boolean;
  editLocked: boolean;
  pendingRequestId: string | null;
  directTrade?: DirectTradeView | null;
};

export type DmRoomPayload = {
  messagingBlocked?: boolean;
  blockMessage?: string;
  room: {
    id: string;
    type: string;
    displayName: string;
    displayImage: string | null;
    otherUserId: string | null;
    profileUsername: string | null;
    memberCount?: number;
    members?: ChatRoomMember[];
    otherTimeZone?: string | null;
    usedTrade?: UsedTradeRoomContext | null;
    canMessage?: boolean;
    canCall?: boolean;
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
    attachments?: {
      url: string;
      type: "IMAGE" | "VIDEO" | "AUDIO" | "GIF";
      name?: string;
      priceKrw?: number;
    }[];
  }
) {
  return apiRequest<{ message: ChatMessage; contentFiltered?: boolean }>(`${MobileApi.messages}/${roomId}`, {
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

export type MessageUserHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  canMessage?: boolean;
};

export async function addRoomMember(roomId: string, username: string) {
  return apiRequest<{
    ok: true;
    roomType: "GROUP";
    added: ChatRoomMember;
  }>(`${MobileApi.messages}/${roomId}/members`, {
    method: "POST",
    body: { username },
  });
}

export async function searchMessageUsers(q: string) {
  const query = new URLSearchParams({ q });
  return apiRequest<{ users: MessageUserHit[] }>(`${MobileApi.search}?${query}`, {
    auth: true,
  });
}

/** People the current user follows — for inbox “Send message” picker. */
export async function fetchFollowingForDm(q?: string) {
  const query = new URLSearchParams();
  if (q?.trim()) query.set("q", q.trim());
  const suffix = query.toString() ? `?${query}` : "";
  return apiRequest<{ users: MessageUserHit[] }>(`${MobileApi.following}${suffix}`, {
    auth: true,
  });
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

export async function waitDmInbox(since: string, signal?: AbortSignal) {
  const q = new URLSearchParams({ since });
  return apiRequest<{ changed: boolean; rooms?: DmInboxRoom[]; serverTime: string }>(
    `${MobileApi.messages}/wait?${q}`,
    { auth: true, signal, timeoutMs: 12_000 }
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
