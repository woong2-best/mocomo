import type { Transition, Variants } from "framer-motion";

/** 스크롤 reveal — 상단 N개는 즉시 표시 (invisible stuck 방지) */
export const MOTION_REVEAL_EAGER = 3;
/** 스크롤 reveal — 이 개수 초과는 옵저버 생략 (성능) */
export const MOTION_REVEAL_MAX = 8;

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const springSoft: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 28,
};

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.12, ease: "easeIn" },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: springSnappy },
};

export const navIconTap = { scale: 0.88 };
export const navIconHover = { scale: 1.08, y: -2 };

export const pressTap = { scale: 0.96 };
export const cardHover = { y: -4, transition: springSoft };

/** 네이티브 셸 — 라우트 전환 (가벼운 페이드 + 슬라이드) */
export const nativeRouteVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.1, ease: "easeIn" },
  },
};

/** 스크롤 시 등장 */
export const inViewItem: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
};

export const popVariants: Variants = {
  idle: { scale: 1 },
  pop: { scale: [1, 1.35, 1], transition: { duration: 0.35 } },
};

/** 바텀 시트 */
export const sheetBackdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const sheetPanel: Variants = {
  hidden: { y: "100%", opacity: 0.6 },
  show: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 340, damping: 32 },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
};

export const matchBurst: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 22 },
  },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.18 } },
};
