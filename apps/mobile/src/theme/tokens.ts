/**
 * MoCoMo mobile design tokens — mirrors web surrealist folk art
 * (`src/app/globals.css` :root / .dark).
 */

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  muted: string;
  searchFill: string;

  cobalt: string;
  /** Brand / link blue — brighter on dark for contrast */
  brand: string;
  terracotta: string;
  gold: string;
  forest: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;

  border: string;
  borderStrong: string;
  hairline: string;

  danger: string;
  success: string;
  like: string;
  accent: string;
  fab: string;

  /** Floating tab active halo (light) / terracotta wash (dark) */
  tabActiveGlow: string;
  tabGlass: string;
  tabGlassTint: string;
  tabGlassBorder: string;
  tabIcon: string;
  tabIconActive: string;
  tabLabel: string;
  tabLabelActive: string;

  blurTint: "light" | "dark";
  statusBarStyle: "dark" | "light";
};

/** Light — cream / cobalt / terracotta (web :root) */
export const lightColors: ThemeColors = {
  background: "#F5F0E8",
  surface: "#FAF7F2",
  surfaceRaised: "#FFFFFF",
  muted: "#EDE6DA",
  searchFill: "#EDE6DA",

  cobalt: "#1B4A8C",
  brand: "#1B4A8C",
  terracotta: "#C5522A",
  gold: "#D4A63A",
  forest: "#2E5C3A",

  text: "#142848",
  textSecondary: "#3D4F6A",
  textMuted: "#5A6A82",
  textOnAccent: "#FFFBF5",

  border: "#A8B4C8",
  borderStrong: "#7A8BA8",
  hairline: "rgba(27, 74, 140, 0.15)",

  danger: "#B33A1F",
  success: "#2E5C3A",
  like: "#C5522A",
  accent: "#C5522A",
  fab: "#C5522A",

  tabActiveGlow: "rgba(120, 170, 230, 0.35)",
  tabGlass: "rgba(255,255,255,0.55)",
  tabGlassTint: "rgba(255,251,245,0.35)",
  tabGlassBorder: "rgba(255,255,255,0.85)",
  tabIcon: "#1B4A8C",
  tabIconActive: "#1B4A8C",
  tabLabel: "rgba(27, 74, 140, 0.7)",
  tabLabelActive: "#1B4A8C",

  blurTint: "light",
  statusBarStyle: "dark",
};

/**
 * Dark — deep navy folk (web .dark hsl(224 45% 12%) …).
 * Cobalt brand brightened for logo/links; terracotta slightly lifted.
 */
export const darkColors: ThemeColors = {
  background: "#111B2E",
  surface: "#18243A",
  surfaceRaised: "#1E2C45",
  muted: "#232F42",
  searchFill: "#232F42",

  cobalt: "#1B4A8C",
  brand: "#6BA3E8",
  terracotta: "#CF6640",
  gold: "#C9A03A",
  forest: "#3D7A4E",

  text: "#F5F0E8",
  textSecondary: "#D4CBB8",
  textMuted: "#A89F8E",
  textOnAccent: "#FFFBF5",

  border: "#363F52",
  borderStrong: "#4A5568",
  hairline: "rgba(245, 240, 232, 0.12)",

  danger: "#E06B4F",
  success: "#4A9B5C",
  like: "#CF6640",
  accent: "#CF6640",
  fab: "#CF6640",

  tabActiveGlow: "rgba(207, 102, 64, 0.28)",
  tabGlass: "rgba(24, 36, 58, 0.72)",
  tabGlassTint: "rgba(17, 27, 46, 0.45)",
  tabGlassBorder: "rgba(255,255,255,0.12)",
  tabIcon: "#A89F8E",
  tabIconActive: "#CF6640",
  tabLabel: "#A89F8E",
  tabLabelActive: "#CF6640",

  blurTint: "dark",
  statusBarStyle: "light",
};

/** @deprecated Prefer `useTheme().colors` — static light palette for rare non-React helpers */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const shadows = {
  soft: {
    shadowColor: "#1B4A8C",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  fab: {
    shadowColor: "#C5522A",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  folkSm: {
    shadowColor: "#1B4A8C",
    shadowOpacity: 0.1,
    shadowRadius: 0,
    shadowOffset: { width: 2, height: 3 },
    elevation: 2,
  },
  folk: {
    shadowColor: "#1B4A8C",
    shadowOpacity: 0.14,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 4 },
    elevation: 3,
  },
} as const;

export const typography = {
  brand: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "500" as const },
  label: { fontSize: 13, fontWeight: "700" as const },
} as const;
