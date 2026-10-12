export type MobileAuthUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  locale?: string | null;
  countryCode?: string | null;
  usedServiceRegion?: string | null;
  timeZone?: string | null;
  postsLocked?: boolean;
  bio?: string | null;
  bannerUrl?: string | null;
  bannerVideoUrl?: string | null;
  createdAt?: string | null;
  counts?: {
    posts: number;
    followers: number;
    following: number;
  };
  hasPassword?: boolean;
  preferences?: {
    feedRecommendationEnabled: boolean;
    showLikeCounts: boolean;
    watermarkInsertEnabled?: boolean;
    watermarkPlacement?: "corner" | "diagonal" | null;
  };
  moneyAge?: {
    allowed: boolean;
    reason: "missing" | "underage" | null;
    hasBirthDate: boolean;
    minAge?: number;
  };
  isModerator?: boolean;
  accountStatus?: string;
  readOnly?: boolean;
  suspensionReason?: string | null;
  suspensionExpiresAt?: string | null;
  pendingSanctionNotice?: {
    id: string;
    kind: string;
    targetType: string;
    targetId: string | null;
    reason: string | null;
    startsAt: string;
    endsAt: string | null;
    accountStatus: string;
    readOnly: boolean;
  } | null;
};
