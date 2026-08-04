export const LIVE_EXTERNAL_PROVIDERS = ["YOUTUBE", "TWITCH", "CHZZK"] as const;
export type LiveExternalProvider = (typeof LIVE_EXTERNAL_PROVIDERS)[number];

export type LiveMediaSourceType = "FIRST_PARTY" | "EXTERNAL";

export type ParsedExternalLiveSource = {
  provider: LiveExternalProvider;
  /** YouTube video/live id, Twitch channel login, Chzzk channel id */
  externalId: string;
  /** Canonical watch URL for “open in new window” fallback */
  watchUrl: string;
  /** HTTPS iframe src when embed is supported; null → open-external fallback */
  embedUrl: string | null;
  embedSupported: boolean;
};
