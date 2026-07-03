export const FEED_DISPLAY_MODES = ["TIMELINE", "COMPACT"] as const;
export type FeedDisplayMode = (typeof FEED_DISPLAY_MODES)[number];

export const FEED_DISPLAY_MODE_COOKIE = "mocomo_feed_mode";
export const DEFAULT_FEED_DISPLAY_MODE: FeedDisplayMode = "TIMELINE";

export function isFeedDisplayMode(value: string): value is FeedDisplayMode {
  return (FEED_DISPLAY_MODES as readonly string[]).includes(value);
}

export function normalizeFeedDisplayMode(value: string | null | undefined): FeedDisplayMode {
  if (value && isFeedDisplayMode(value)) return value;
  return DEFAULT_FEED_DISPLAY_MODE;
}
