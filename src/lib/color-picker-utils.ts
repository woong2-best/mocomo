/** Windows 기본 색상 팔레트 (48) */
export const BASIC_COLORS: readonly string[] = [
  "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0",
  "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff",
  "#000000", "#00005f", "#000087", "#0000af", "#0000d7", "#0000ff", "#005f00", "#005f5f",
  "#005f87", "#005faf", "#005fd7", "#005fff", "#008700", "#00875f", "#008787", "#0087af",
  "#0087d7", "#0087ff", "#00af00", "#00af5f", "#00af87", "#00afaf", "#00afd7", "#00afff",
  "#00d700", "#00d75f", "#00d787", "#00d7af", "#00d7d7", "#00d7ff", "#00ff00", "#00ff5f",
];

export const CUSTOM_COLORS_STORAGE_KEY = "mocomo_studio_custom_colors";
export const CUSTOM_COLOR_SLOTS = 16;

export type Rgb = { r: number; g: number; b: number };
export type Hsv = { h: number; s: number; v: number };

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [a, b, c] = raw.split("");
    return `#${a}${a}${b}${b}${c}${c}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const n = normalizeHex(hex) ?? "#000000";
  const v = parseInt(n.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (c: number) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d > 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((clamp(h, 0, 360) / 60) % 2) - 1));
  const m = vn - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;
  const hue = clamp(h, 0, 360);
  if (hue < 60) [rp, gp, bp] = [c, x, 0];
  else if (hue < 120) [rp, gp, bp] = [x, c, 0];
  else if (hue < 180) [rp, gp, bp] = [0, c, x];
  else if (hue < 240) [rp, gp, bp] = [0, x, c];
  else if (hue < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return {
    r: (rp + m) * 255,
    g: (gp + m) * 255,
    b: (bp + m) * 255,
  };
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}

export function hexToHsv(hex: string): Hsv {
  return rgbToHsv(hexToRgb(hex));
}

export function hueToHex(h: number): string {
  return hsvToHex({ h, s: 100, v: 100 });
}

export function loadCustomColors(): string[] {
  if (typeof window === "undefined") {
    return Array.from({ length: CUSTOM_COLOR_SLOTS }, () => "#ffffff");
  }
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (!raw) return Array.from({ length: CUSTOM_COLOR_SLOTS }, () => "#ffffff");
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return Array.from({ length: CUSTOM_COLOR_SLOTS }, () => "#ffffff");
    return Array.from({ length: CUSTOM_COLOR_SLOTS }, (_, i) => normalizeHex(parsed[i] ?? "") ?? "#ffffff");
  } catch {
    return Array.from({ length: CUSTOM_COLOR_SLOTS }, () => "#ffffff");
  }
}

export function saveCustomColors(colors: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(colors.slice(0, CUSTOM_COLOR_SLOTS)));
}
