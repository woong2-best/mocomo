import type { ConnectableStreamingPlatform, StreamingPlatformProvider } from "./types";
import { youtubeStreamingProvider } from "./providers/youtube";
import { twitchStreamingProvider } from "./providers/twitch";

const PROVIDERS: Record<ConnectableStreamingPlatform, StreamingPlatformProvider> = {
  YOUTUBE: youtubeStreamingProvider,
  TWITCH: twitchStreamingProvider,
};

export function getStreamingProvider(
  platform: ConnectableStreamingPlatform
): StreamingPlatformProvider {
  const p = PROVIDERS[platform];
  if (!p) throw new Error(`Unsupported streaming platform: ${platform}`);
  return p;
}

export function listStreamingProviders(): StreamingPlatformProvider[] {
  return Object.values(PROVIDERS);
}

export function isOAuthStreamingPlatform(platform: ConnectableStreamingPlatform): boolean {
  return getStreamingProvider(platform).supportsOAuth;
}
