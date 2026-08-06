/** Floating translucent pill tab bar — match provided screenshot. */
export const FLOATING_TAB = {
  height: 68,
  horizontalInset: 22,
  bottomGap: 10,
  radius: 34,
} as const;

export function floatingTabClearance(bottomInset: number): number {
  return FLOATING_TAB.height + FLOATING_TAB.bottomGap + Math.max(bottomInset, 8) + 14;
}

/** @deprecated alias */
export const MOBILE_NAV = FLOATING_TAB;
export function mobileNavClearance(bottomInset: number): number {
  return floatingTabClearance(bottomInset);
}
