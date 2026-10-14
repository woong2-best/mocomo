import type { DrawerRoute } from "@/navigation/types";

type ReelsWideNavIcon =
  | "radio-outline"
  | "cart-outline"
  | "star-outline"
  | "people-outline"
  | "book-outline"
  | "wallet-outline";

/** Instagram-style Reels stage. Wider viewports keep this column and use side rails. */
export const REELS_STAGE_ASPECT = 9 / 16;

/**
 * Slack so 9:16-class phones (iPhone SE ≈ 0.562) stay full-bleed.
 * Tablets / unfolded folds / landscape clear this easily.
 */
export const REELS_WIDE_ASPECT_SLACK = 0.04;

/** Minimum gutter for a tappable icon rail on each side. */
export const REELS_WIDE_MIN_RAIL = 64;

/** Instagram card radius on the centered 9:16 stage (fold / tablet). */
export const REELS_WIDE_CARD_RADIUS = 18;

/** Phone 2× hold strip — keep narrow so the action rail stays tappable. */
export const REELS_PHONE_EDGE_HOLD = 52;

/** Fold / tablet 2× hold sits on the video frame, not the nav-button gutter. */
export const REELS_WIDE_EDGE_HOLD_MIN = 80;
export const REELS_WIDE_EDGE_HOLD_MAX = 132;
export const REELS_WIDE_EDGE_HOLD_RATIO = 0.2;

/** Left-edge 2× width on the video card. Wide = Instagram-sized frame, not the side buttons. */
export function reelsEdgeHoldWidth(stageWidth: number, isWide: boolean): number {
  if (!isWide) return REELS_PHONE_EDGE_HOLD;
  const fromRatio = Math.round(stageWidth * REELS_WIDE_EDGE_HOLD_RATIO);
  return Math.min(REELS_WIDE_EDGE_HOLD_MAX, Math.max(REELS_WIDE_EDGE_HOLD_MIN, fromRatio));
}

export type ReelsWideNavRoute = Extract<
  DrawerRoute,
  "LiveList" | "Used" | "StarList" | "CommunityList" | "AnimeList" | "Wallet"
>;

export type ReelsWideNavItem = {
  route: ReelsWideNavRoute;
  labelKey: string;
  icon: ReelsWideNavIcon;
};

/** Same destinations + Ionicons as the side drawer / tab bar — not Instagram chrome. */
export const REELS_WIDE_NAV_ITEMS: readonly ReelsWideNavItem[] = [
  { route: "LiveList", labelKey: "nav.live", icon: "radio-outline" },
  { route: "Used", labelKey: "nav.market", icon: "cart-outline" },
  { route: "StarList", labelKey: "nav.star", icon: "star-outline" },
  { route: "CommunityList", labelKey: "nav.communities", icon: "people-outline" },
  { route: "AnimeList", labelKey: "nav.anime", icon: "book-outline" },
  { route: "Wallet", labelKey: "nav.wallet", icon: "wallet-outline" },
];

export type ReelsChromeLayout = {
  isWide: boolean;
  stageWidth: number;
  stageHeight: number;
  stageLeft: number;
  leftRailWidth: number;
  rightRailWidth: number;
};

export function isReelsWideViewport(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  return width / height > REELS_STAGE_ASPECT + REELS_WIDE_ASPECT_SLACK;
}

export function computeReelsChromeLayout(width: number, height: number): ReelsChromeLayout {
  const safeW = Math.max(0, Math.round(width));
  const safeH = Math.max(0, Math.round(height));
  if (!isReelsWideViewport(safeW, safeH)) {
    return {
      isWide: false,
      stageWidth: safeW,
      stageHeight: safeH,
      stageLeft: 0,
      leftRailWidth: 0,
      rightRailWidth: 0,
    };
  }

  const minGutter = REELS_WIDE_MIN_RAIL * 2;
  const idealStage = Math.round(safeH * REELS_STAGE_ASPECT);
  const leftover = safeW - idealStage;

  if (leftover >= minGutter) {
    const leftRailWidth = Math.floor(leftover / 2);
    const rightRailWidth = leftover - leftRailWidth;
    return {
      isWide: true,
      stageWidth: idealStage,
      stageHeight: safeH,
      stageLeft: leftRailWidth,
      leftRailWidth,
      rightRailWidth,
    };
  }

  const stageWidth = Math.max(1, safeW - minGutter);
  return {
    isWide: true,
    stageWidth,
    stageHeight: safeH,
    stageLeft: REELS_WIDE_MIN_RAIL,
    leftRailWidth: REELS_WIDE_MIN_RAIL,
    rightRailWidth: safeW - stageWidth - REELS_WIDE_MIN_RAIL,
  };
}
