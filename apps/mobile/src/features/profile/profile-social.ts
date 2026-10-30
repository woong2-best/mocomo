import type { ComponentType } from "react";
import { YoutubeMark, TwitchMark } from "@/features/live/StreamingBrandMark";

export const PROFILE_SOCIAL_IDS = [
  "youtube",
  "twitch",
  "facebook",
  "instagram",
  "twitter",
  "discord",
  "naver",
  "tiktok",
] as const;
export type ProfileSocialId = (typeof PROFILE_SOCIAL_IDS)[number];

export type ProfileSocialLink = {
  id: ProfileSocialId;
  href: string | null;
  label: string;
  iconSrc: string;
};

export const PROFILE_SOCIAL_META: Record<
  ProfileSocialId,
  {
    label: string;
    icon?: number;
    Mark?: ComponentType<{ height?: number }>;
  }
> = {
  youtube: { label: "YouTube", Mark: YoutubeMark },
  twitch: { label: "Twitch", Mark: TwitchMark },
  facebook: {
    label: "Facebook",
    icon: require("../../../assets/brand/facebook.png"),
  },
  instagram: {
    label: "Instagram",
    icon: require("../../../assets/brand/instagram.png"),
  },
  twitter: {
    label: "X",
    icon: require("../../../assets/brand/twitter.png"),
  },
  discord: {
    label: "Discord",
    icon: require("../../../assets/brand/discord.png"),
  },
  naver: {
    label: "CHZZK",
    icon: require("../../../assets/brand/chzzk.png"),
  },
  tiktok: {
    label: "TikTok",
    icon: require("../../../assets/brand/tiktok.png"),
  },
};

const ICON_SCALE: Record<ProfileSocialId, number> = {
  youtube: 1.06,
  twitch: 1,
  facebook: 1,
  instagram: 1,
  twitter: 1.04,
  discord: 1.08,
  naver: 1,
  tiktok: 1.22,
};

export function profileSocialIconScale(id: ProfileSocialId): number {
  return ICON_SCALE[id] ?? 1;
}

export function socialIconSize(screenWidth: number) {
  return Math.round(Math.min(36, Math.max(22, screenWidth * 0.075)));
}
