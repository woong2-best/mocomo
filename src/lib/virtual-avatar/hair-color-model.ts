import * as THREE from "three";
import { clamp, normalizeHex } from "@/lib/color-picker-utils";

/** 사용자 선택색 → MToon 3단계 + 외곽선 */
export type HairColorPalette = {
  /** 사용자가 고른 HEX (기준색) */
  base: string;
  /** 밝은 면 (lit) */
  highlight: string;
  /** 그림 면 (shade) */
  shadow: string;
  /** 라인아트 */
  outline: string;
};

export type HairPaletteOptions = {
  skinHex?: string;
  /** 피부와 명도가 비슷할 때 헤어 명도 자동 보정 */
  autoSkinContrast?: boolean;
};

const MIN_SKIN_HAIR_LIGHTNESS_DELTA = 0.1;

type Hsl = { h: number; s: number; l: number };

function readHsl(hex: string): Hsl {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return hsl;
}

function writeHsl({ h, s, l }: Hsl): string {
  const c = new THREE.Color();
  c.setHSL(((h % 1) + 1) % 1, clamp(s, 0, 1), clamp(l, 0, 1));
  return `#${c.getHexString()}`;
}

function shiftHsl(hex: string, delta: Partial<Hsl>): string {
  const hsl = readHsl(hex);
  if (delta.h !== undefined) hsl.h = delta.h;
  if (delta.s !== undefined) hsl.s = delta.s;
  if (delta.l !== undefined) hsl.l = delta.l;
  return writeHsl(hsl);
}

/** 선택 HEX에서 Highlight / Shadow / Outline 자동 생성 */
export function buildHairColorPalette(inputHex: string): HairColorPalette {
  const base = normalizeHex(inputHex) ?? "#1a1a1a";
  const { h, s, l } = readHsl(base);

  let highlightL: number;
  let highlightS: number;
  let shadowL: number;
  let shadowS: number;

  if (l < 0.04) {
    highlightL = 0.1;
    highlightS = clamp(s * 0.4, 0, 0.15);
    shadowL = 0.015;
    shadowS = 0;
  } else if (l > 0.92) {
    highlightL = 1;
    highlightS = clamp(s * 0.25, 0, 0.12);
    shadowL = clamp(l * 0.82, 0.72, 0.9);
    shadowS = clamp(s * 0.5, 0, 0.2);
  } else {
    highlightL = clamp(l + (1 - l) * 0.11 + 0.03, 0, 1);
    highlightS = clamp(s * (l > 0.7 ? 0.75 : 0.9), 0, 1);
    shadowL = clamp(l * 0.58 - 0.035, 0, 1);
    shadowS = clamp(Math.min(s * 1.06 + 0.03, 1), 0, 1);
  }

  const highlight = writeHsl({ h, s: highlightS, l: highlightL });
  const shadow = writeHsl({ h, s: shadowS, l: shadowL });
  const outline = buildHairOutline({ h, s, l }, base);

  return { base, highlight, shadow, outline };
}

function buildHairOutline(hsl: Hsl, baseHex: string): string {
  const { h, s, l } = hsl;

  if (l >= 0.7 && s <= 0.2) {
    return writeHsl({ h: 35 / 360, s: 0.38, l: 0.28 });
  }
  if (l >= 0.55 && h >= 0.06 && h <= 0.16) {
    return writeHsl({ h: 0.085, s: 0.5, l: 0.24 });
  }
  if (l < 0.1) {
    return writeHsl({ h, s: Math.min(s * 0.2, 0.1), l: clamp(l * 0.65 + 0.04, 0.035, 0.12) });
  }

  const outlineL = clamp(l * 0.7 - 0.025, 0.05, 0.42);
  const outlineS = clamp(Math.min(s * 1.12 + 0.04, 1), 0, 1);
  return writeHsl({ h, s: outlineS, l: outlineL });
}

/** 피부·헤어 명도가 너무 가까우면 헤어 팔레트 전체를 살짝 이동 */
export function guardHairSkinContrast(
  palette: HairColorPalette,
  skinHex: string | undefined,
  enabled: boolean
): HairColorPalette {
  if (!enabled || !skinHex) return palette;

  const skin = readHsl(normalizeHex(skinHex) ?? "#f0d8c8");
  const hair = readHsl(palette.base);
  if (Math.abs(skin.l - hair.l) >= MIN_SKIN_HAIR_LIGHTNESS_DELTA) return palette;

  const pushDown = skin.l >= 0.45;
  const targetHairL = pushDown
    ? clamp(skin.l - MIN_SKIN_HAIR_LIGHTNESS_DELTA - 0.03, 0, 1)
    : clamp(skin.l + MIN_SKIN_HAIR_LIGHTNESS_DELTA + 0.03, 0, 1);
  const delta = targetHairL - hair.l;

  return {
    base: shiftHsl(palette.base, { l: hair.l + delta }),
    highlight: shiftHsl(palette.highlight, { l: readHsl(palette.highlight).l + delta }),
    shadow: shiftHsl(palette.shadow, { l: readHsl(palette.shadow).l + delta }),
    outline: shiftHsl(palette.outline, { l: readHsl(palette.outline).l + delta }),
  };
}

export function resolveHairColorPalette(hexInput: string, opts?: HairPaletteOptions): HairColorPalette {
  const palette = buildHairColorPalette(hexInput);
  return guardHairSkinContrast(palette, opts?.skinHex, opts?.autoSkinContrast !== false);
}
