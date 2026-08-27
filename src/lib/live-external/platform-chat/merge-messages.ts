import type { PlatformChatMessage } from "@/lib/live-external/platform-chat/types";

export type UnifiedChatSource = "MOCOMO" | "TWITCH" | "YOUTUBE" | "CHZZK";

export type UnifiedChatMessage = {
  id: string;
  username: string;
  content: string;
  at: number;
  source: UnifiedChatSource;
  /** MoCoMo 후원·룰렛·미션 등 시스템 라인 */
  messageKind?: "support" | "tip" | "mission";
  supportAmount?: number;
  eventType?: string;
  rouletteLabel?: string;
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

/** Live chat + OBS overlay — username colors (no platform text badges) */
export const CHAT_SOURCE_USERNAME_COLOR: Record<UnifiedChatSource, string> = {
  MOCOMO: "#f97316",
  TWITCH: "#9146FF",
  YOUTUBE: "#ef4444",
  CHZZK: "#9333ea",
};

/** @deprecated use CHAT_SOURCE_USERNAME_COLOR */
export const OVERLAY_SOURCE_USERNAME_COLOR = CHAT_SOURCE_USERNAME_COLOR;

export function chatUsernameColor(source: UnifiedChatSource): string {
  return CHAT_SOURCE_USERNAME_COLOR[source];
}
