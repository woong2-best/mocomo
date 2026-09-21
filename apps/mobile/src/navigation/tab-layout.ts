/** Bottom inset helpers. Floating tab bar is removed — clearance is safe-area only. */
export const FLOATING_TAB = {
  height: 0,
  horizontalInset: 22,
  bottomGap: 0,
  radius: 34,
} as const;

export function floatingTabClearance(bottomInset: number): number {
  return Math.max(bottomInset, 8) + 16;
}

/** @deprecated alias */
export const MOBILE_NAV = FLOATING_TAB;
export function mobileNavClearance(bottomInset: number): number {
  return floatingTabClearance(bottomInset);
}
