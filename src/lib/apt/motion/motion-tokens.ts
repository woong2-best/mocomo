/** RC Sprint 2 — Motion Bible (issue-driven tokens) */

export const motion = {
  fast: 180,
  normal: 260,
  slow: 420,
  hero: 900,
  toast: 2600,
} as const;

export const motionCurve = {
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
