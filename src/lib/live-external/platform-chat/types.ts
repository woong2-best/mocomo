import type { LiveExternalProvider } from "@/lib/live-external/types";

export type PlatformChatSource = LiveExternalProvider;

export type PlatformChatMessage = {
  id: string;
  source: PlatformChatSource;
  username: string;
  content: string;
  at: number;
  image?: string | null;
  /** Synthetic — not a MoCoMo user */
  userId: string;
};

export function platformUserId(source: PlatformChatSource, username: string): string {
  return `platform:${source.toLowerCase()}:${username.toLowerCase()}`;
}
