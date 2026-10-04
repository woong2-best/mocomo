import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type StudioCategory = "JUST_CHATTING" | "GAME" | "MUSIC" | "IRL" | "LIVE";

export type StudioSettings = {
  bio: string;
  announcement: string;
  scheduleNote: string;
  scheduleWeekdays: number[];
  scheduleTime: string;
  defaultTitle: string;
  defaultCategory: string;
};

export type StudioAccount = {
  id: string;
  platform: "YOUTUBE" | "TWITCH";
  channelId: string;
  channelName: string;
  channelUrl: string;
  profileImage: string | null;
  verified: boolean;
  pendingVerification: boolean;
};

export type StudioRole = "OWNER" | "MANAGER" | "MODERATOR" | "VIP" | "VIEWER";

export type StudioStaff = {
  userId: string;
  username: string;
  name: string | null;
  image: string | null;
  role: StudioRole;
};

export type StudioBan = {
  userId: string;
  username: string;
  image: string | null;
  bannedBy: string;
  reason: string | null;
  at: string;
};

export type StudioSearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  currentRole: StudioRole;
  isBanned: boolean;
};

export function fetchStudioSettings() {
  return apiRequest<StudioSettings>(MobileApi.liveStudio, { auth: true });
}

export function saveStudioSettings(body: {
  defaultCategory: StudioCategory;
  announcement: string;
  bio: string;
  scheduleNote: string;
  scheduleWeekdays: number[];
  scheduleTime: string;
}) {
  return apiRequest<{ success: boolean }>(MobileApi.liveStudio, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export function fetchStudioAccounts() {
  return apiRequest<{ accounts: StudioAccount[] }>(MobileApi.liveStudioAccounts, { auth: true });
}

export function disconnectStudioAccount(accountId: string) {
  return apiRequest<{ success: boolean }>(MobileApi.liveStudioAccounts, {
    method: "DELETE",
    auth: true,
    body: { accountId },
  });
}

export function startStudioConnect(platform: "YOUTUBE" | "TWITCH") {
  return apiRequest<{ url: string }>(MobileApi.liveStudioConnect, {
    method: "POST",
    auth: true,
    body: { platform },
  });
}

export function fetchStudioStaff() {
  return apiRequest<{ staff: StudioStaff[] }>(MobileApi.liveStudioStaff, { auth: true });
}

export function assignStudioStaff(userId: string) {
  return apiRequest<{ success: boolean }>(MobileApi.liveStudioStaff, {
    method: "POST",
    auth: true,
    body: { userId },
  });
}

export function removeStudioStaff(userId: string) {
  return apiRequest<{ success: boolean }>(MobileApi.liveStudioStaff, {
    method: "DELETE",
    auth: true,
    body: { userId },
  });
}

export function fetchStudioBans() {
  return apiRequest<{ bans: StudioBan[] }>(MobileApi.liveStudioBans, { auth: true });
}

export function banStudioViewer(userId: string) {
  return apiRequest<{ success: boolean }>(MobileApi.liveStudioBans, {
    method: "POST",
    auth: true,
    body: { userId },
  });
}

export function unbanStudioViewer(userId: string) {
  return apiRequest<{ success: boolean }>(MobileApi.liveStudioBans, {
    method: "DELETE",
    auth: true,
    body: { userId },
  });
}

export function searchStudioUsers(query: string) {
  const q = encodeURIComponent(query.trim());
  return apiRequest<{ users: StudioSearchHit[] }>(`${MobileApi.liveStudioSearch}?q=${q}`, {
    auth: true,
  });
}

export function fetchStudioObsChat() {
  return apiRequest<{ chatUrl: string | null; empty: boolean }>(MobileApi.liveStudioObsChat, {
    auth: true,
  });
}
