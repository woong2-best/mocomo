import type { PlatformChatMessage } from "./types";
import { platformUserId } from "./types";
import {
  sanitizePlatformChatText,
  sanitizePlatformChatUsername,
} from "./sanitize";

/** Parse Twitch IRC PRIVMSG (tags format) into a platform chat message. */
export function parseTwitchIrcPrivmsg(
  raw: string,
  channelLogin: string
): PlatformChatMessage | null {
  if (!raw.includes("PRIVMSG")) return null;

  const contentMatch = raw.match(/PRIVMSG #[^ ]+ :(.+)\r?$/);
  if (!contentMatch?.[1]) return null;
  const content = sanitizePlatformChatText(contentMatch[1].trim());
  if (!content) return null;

  const displayName = raw.match(/display-name=([^;]*)/)?.[1]?.trim();
  const nickMatch = raw.match(/:([^!]+)!/);
  const username = sanitizePlatformChatUsername(displayName || nickMatch?.[1] || "");
  if (!username) return null;

  const channelMatch = raw.match(/PRIVMSG #([^ ]+)/);
  if (channelMatch?.[1]?.toLowerCase() !== channelLogin.toLowerCase()) return null;

  const idTag = raw.match(/(?:^|;)id=([^;\s]+)/)?.[1]?.trim();
  const at = Date.now();
  const id = idTag
    ? `twitch:${idTag}`
    : `twitch:${at}:${username}:${content.slice(0, 40)}`;

  return {
    id,
    source: "TWITCH",
    username,
    content,
    at,
    userId: platformUserId("TWITCH", username),
  };
}
