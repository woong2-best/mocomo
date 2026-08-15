/** Numeric layout constants safe to capture inside Reanimated worklets */
export const CARD_PEEK = 46;
export const CARD_GAP = 14;
export const CARD_EXPAND_TRAVEL = 200;
export const CARD_HORIZONTAL_INSET = 16;
export const CARD_BORDER_RADIUS = 24;
export const CARD_MIN_HEIGHT = 168;
export const CARD_MAX_HEIGHT = 196;
export const CARD_ASPECT = 1.586;

export const SWIPE_THRESHOLD = 72;
export const SWIPE_VELOCITY = 650;
export const EXPAND_VELOCITY = 900;

export const SPRING_SNAP = { damping: 24, stiffness: 280, mass: 0.85 } as const;
export const SPRING_SOFT = { damping: 28, stiffness: 220, mass: 0.9 } as const;
export const SPRING_CARD = { damping: 22, stiffness: 260, mass: 0.8 } as const;

export type WalletCardModel = {
  id: string;
  backgroundColor: string;
  eyebrow: string;
  title: string;
  amount: string;
  subtitle: string;
  badge?: string;
  expandedLines: string[];
};

export function cardHeightFromWidth(screenWidth: number) {
  const w = screenWidth - CARD_HORIZONTAL_INSET * 2;
  const h = w / CARD_ASPECT;
  return Math.min(CARD_MAX_HEIGHT, Math.max(CARD_MIN_HEIGHT, h));
}

export function collapsedHeight(cardH: number, count: number) {
  return cardH + (count - 1) * CARD_PEEK + 8;
}

export function expandedHeight(cardH: number, count: number) {
  return count * (cardH + 28) + (count - 1) * CARD_GAP + 24;
}
