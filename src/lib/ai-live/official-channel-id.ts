/** Stable id for the always-on official broadcast. Not a public hub card. */
export const MOCO_OFFICIAL_CHANNEL_ID = "moco-official";
export const MOCO_OFFICIAL_USERNAME = "mocomo_official";

export function isMocoOfficialChannel(channelId: string | null | undefined): boolean {
  return channelId === MOCO_OFFICIAL_CHANNEL_ID;
}
