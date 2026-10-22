/** Stable ids for always-on broadcasts. They are tiles, not extra hub rows. */
export const MOCO_OFFICIAL_CHANNEL_ID = "moco-official";
export const MOCO_OFFICIAL_USERNAME = "mocomo_official";

export const IDOL_CHANNEL_IDS = ["idol-airi", "idol-chloe", "idol-stella"] as const;

export const ALWAYS_ON_LIVE_CHANNEL_IDS = [MOCO_OFFICIAL_CHANNEL_ID, ...IDOL_CHANNEL_IDS] as const;

export function isMocoOfficialChannel(channelId: string | null | undefined): boolean {
  return channelId === MOCO_OFFICIAL_CHANNEL_ID;
}

export function isAlwaysOnLiveChannel(channelId: string | null | undefined): boolean {
  return !!channelId && (ALWAYS_ON_LIVE_CHANNEL_IDS as readonly string[]).includes(channelId);
}
