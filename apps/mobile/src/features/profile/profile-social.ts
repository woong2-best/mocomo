export const PROFILE_SOCIAL_IDS = ["facebook", "instagram", "twitter", "naver"] as const;
export type ProfileSocialId = (typeof PROFILE_SOCIAL_IDS)[number];

export type ProfileSocialLink = {
  id: ProfileSocialId;
  href: string | null;
  label: string;
  iconSrc: string;
};

export const PROFILE_SOCIAL_META: Record<
  ProfileSocialId,
  { label: string; icon: number }
> = {
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
  naver: {
    label: "CHZZK",
    icon: require("../../../assets/brand/chzzk.png"),
  },
};

export function socialIconSize(screenWidth: number) {
  return Math.round(Math.min(36, Math.max(22, screenWidth * 0.075)));
}
