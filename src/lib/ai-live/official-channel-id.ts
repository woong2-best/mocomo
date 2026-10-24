/** Stable ids for always-on broadcasts. They are tiles, not extra hub rows. */
export const MOCO_OFFICIAL_CHANNEL_ID = "moco-official";
/** Platform bootstrap account. Not an avatar login. */
export const PLATFORM_OFFICIAL_USERNAME = "mocomo_official";
export const PLATFORM_OFFICIAL_EMAIL = "platform@mocomo.app";

export const IDOL_CHANNEL_IDS = ["idol-airi", "idol-chloe", "idol-stella"] as const;

export const ALWAYS_ON_LIVE_CHANNEL_IDS = [MOCO_OFFICIAL_CHANNEL_ID, ...IDOL_CHANNEL_IDS] as const;

export type AvatarAccountId = "zelie" | "cleo" | "mio" | "nangnang";

export type AvatarAccountDef = {
  id: AvatarAccountId;
  channelId: string;
  username: string;
  name: string;
  legacyUsernames: readonly string[];
};

/** Real site logins for each always-on avatar. Donations credit these users. */
export const AVATAR_ACCOUNTS: readonly AvatarAccountDef[] = [
  {
    id: "zelie",
    channelId: MOCO_OFFICIAL_CHANNEL_ID,
    username: "zelie",
    name: "Zelie",
    legacyUsernames: [PLATFORM_OFFICIAL_USERNAME],
  },
  {
    id: "cleo",
    channelId: "idol-airi",
    username: "cleo",
    name: "Cleo",
    legacyUsernames: ["idol_airi"],
  },
  {
    id: "mio",
    channelId: "idol-chloe",
    username: "mio",
    name: "Mio",
    legacyUsernames: ["idol_chloe"],
  },
  {
    id: "nangnang",
    channelId: "idol-stella",
    username: "nangnang",
    name: "Nangnang",
    legacyUsernames: ["idol_stella"],
  },
];

export const MOCO_OFFICIAL_USERNAME = AVATAR_ACCOUNTS[0]!.username;

export function avatarAccountByChannelId(channelId: string | null | undefined): AvatarAccountDef | null {
  if (!channelId) return null;
  return AVATAR_ACCOUNTS.find((row) => row.channelId === channelId) ?? null;
}

export function isMocoOfficialChannel(channelId: string | null | undefined): boolean {
  return channelId === MOCO_OFFICIAL_CHANNEL_ID;
}

export function isAlwaysOnLiveChannel(channelId: string | null | undefined): boolean {
  return !!channelId && (ALWAYS_ON_LIVE_CHANNEL_IDS as readonly string[]).includes(channelId);
}
