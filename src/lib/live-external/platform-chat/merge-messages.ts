import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";

export type UnifiedChatSource = "MOCOMO" | "TWITCH" | "YOUTUBE" | "CHZZK";

export type UnifiedChatMessage = {
  id: string;
  username: string;
  content: string;
  at: number;
  source: UnifiedChatSource;
};

export function mergeUnifiedChatMessages(
  batches: UnifiedChatMessage[][],
  max = 150
): UnifiedChatMessage[] {
  const ids = new Set<string>();
  const merged: UnifiedChatMessage[] = [];
  for (const message of batches.flat().sort((a, b) => a.at - b.at)) {
    if (ids.has(message.id)) continue;
    ids.add(message.id);
    merged.push(message);
  }
  return merged.slice(-max);
}

export function platformToUnified(messages: PlatformChatMessage[]): UnifiedChatMessage[] {
  return messages.map((m) => ({
    id: m.id,
    username: m.username,
    content: m.content,
    at: m.at,
    source: m.source,
  }));
}

export const UNIFIED_CHAT_SOURCE_LABEL: Record<UnifiedChatSource, string> = {
  MOCOMO: "MoCoMo",
  TWITCH: "Twitch",
  YOUTUBE: "YouTube",
  CHZZK: "치지직",
};

/** OBS overlay username colors */
export const OVERLAY_SOURCE_USERNAME_COLOR: Record<UnifiedChatSource, string> = {
  MOCOMO: "#7dd3fc",
  TWITCH: "#bf94ff",
  YOUTUBE: "#fca5a5",
  CHZZK: "#6ee7b7",
};
