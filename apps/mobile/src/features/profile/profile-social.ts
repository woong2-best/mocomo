import { API_BASE_URL } from "@/config/env";

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
  { label: string; iconSrc: string }
> = {
  facebook: {
    label: "Facebook",
    iconSrc: `${API_BASE_URL.replace(/\/$/, "")}/brand/facebook.svg`,
  },
  instagram: {
    label: "Instagram",
    iconSrc: `${API_BASE_URL.replace(/\/$/, "")}/brand/instagram.svg`,
  },
  twitter: {
    label: "X",
    iconSrc: `${API_BASE_URL.replace(/\/$/, "")}/brand/twitter.svg`,
  },
  naver: {
    label: "CHZZK",
    iconSrc: `${API_BASE_URL.replace(/\/$/, "")}/brand/chzzk.png`,
  },
};

export function socialIconSize(screenWidth: number) {
  return Math.round(Math.min(36, Math.max(22, screenWidth * 0.075)));
}
