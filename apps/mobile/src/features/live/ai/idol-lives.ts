import type { LiveAvatarHost, LiveAvatarId } from "@/api/live";

export const ZELIE_LIVE_POSTER = require("../../../../assets/moco-live-poster.png");

export const IDOL_LIVES = [
  {
    id: "airi" as const,
    avatarId: "cleo" as const,
    username: "cleo",
    channelId: "idol-airi",
    accent: "#ff4d8d",
    poster: require("../../../../assets/idol-airi.jpg"),
    nameKey: "m.live.idol_airi_name" as const,
    titleKey: "m.live.idol_airi_title" as const,
    roleKey: "m.live.idol_airi_role" as const,
  },
  {
    id: "chloe" as const,
    avatarId: "mio" as const,
    username: "mio",
    channelId: "idol-chloe",
    accent: "#c4a574",
    poster: require("../../../../assets/idol-chloe.jpg"),
    nameKey: "m.live.idol_chloe_name" as const,
    titleKey: "m.live.idol_chloe_title" as const,
    roleKey: "m.live.idol_chloe_role" as const,
  },
  {
    id: "stella" as const,
    avatarId: "nangnang" as const,
    username: "nangnang",
    channelId: "idol-stella",
    accent: "#3ddcff",
    poster: require("../../../../assets/idol-stella.jpg"),
    nameKey: "m.live.idol_stella_name" as const,
    titleKey: "m.live.idol_stella_title" as const,
    roleKey: "m.live.idol_stella_role" as const,
  },
];

export type IdolLiveId = (typeof IDOL_LIVES)[number]["id"];
export type IdolLiveMember = IdolLiveId | "cleo" | "mio" | "nangnang";

const IDOL_ALIAS: Record<string, IdolLiveId> = {
  airi: "airi",
  cleo: "airi",
  chloe: "chloe",
  mio: "chloe",
  stella: "stella",
  nangnang: "stella",
};

export function resolveIdolLiveId(member: string | null | undefined): IdolLiveId {
  const key = member?.trim().toLowerCase() ?? "";
  return IDOL_ALIAS[key] ?? "airi";
}

export function idolByMember(member: string | null | undefined) {
  const id = resolveIdolLiveId(member);
  return IDOL_LIVES.find((item) => item.id === id) ?? IDOL_LIVES[0]!;
}

export function hostFromAvatarMap(
  hosts: Partial<Record<LiveAvatarId, LiveAvatarHost>> | null | undefined,
  id: LiveAvatarId,
  fallbackUsername: string,
  fallbackName: string
): LiveAvatarHost {
  const host = hosts?.[id];
  return {
    id,
    username: host?.username?.trim() || fallbackUsername,
    name: host?.name?.trim() || fallbackName,
    image: host?.image ?? null,
  };
}
