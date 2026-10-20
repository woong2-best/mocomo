/** Left nav and guest-home banner art. Defaults stay in /public/home. */

export const HOME_CHROME_KEY = "site.homeChrome";

export const HOME_CHROME_DEFAULTS = {
  sidebar: "/home/sidebar-bg.png",
  hero: "/home/guest-hero-bg.png",
} as const;

/** Pixel size of the shipped art. Uploads are cover-cropped to this before display. */
export const HOME_CHROME_SIZE = {
  sidebar: { width: 363, height: 1024 },
  hero: { width: 1024, height: 682 },
} as const;

export type HomeChromeSlot = keyof typeof HOME_CHROME_SIZE;

export type HomeChromeUrls = {
  sidebarImageUrl: string | null;
  heroImageUrl: string | null;
};

const DEFAULT_PATHS = new Set<string>([
  HOME_CHROME_DEFAULTS.sidebar,
  HOME_CHROME_DEFAULTS.hero,
]);

const MAX_URL_LENGTH = 500;

function supabaseHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).host;
    return host || null;
  } catch {
    return null;
  }
}

/** Public storage URL or one of the two built-in default paths. Safe to put in CSS. */
export function isSafeHomeChromeUrl(url: string): boolean {
  if (!url || url.length > MAX_URL_LENGTH) return false;
  if (DEFAULT_PATHS.has(url)) return true;
  if (/[\s"'()\\<>]/.test(url)) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    return false;
  }
  const host = supabaseHost();
  if (!host || parsed.host !== host) return false;
  return parsed.pathname.includes("/storage/v1/object/public/");
}

/** Uploaded replacement only — not the built-in files. */
export function isCustomHomeChromeUrl(url: string): boolean {
  return isSafeHomeChromeUrl(url) && !DEFAULT_PATHS.has(url);
}

export function cssImageValue(url: string | null): string | null {
  if (!url || !isSafeHomeChromeUrl(url)) return null;
  return `url("${url}")`;
}

/** Inline style block. Empty when both slots still use the built-in files. */
export function homeChromeCss(urls: HomeChromeUrls): string {
  const parts: string[] = [];
  const sidebar = cssImageValue(urls.sidebarImageUrl);
  const hero = cssImageValue(urls.heroImageUrl);
  if (sidebar) parts.push(`--home-sidebar-image:${sidebar}`);
  if (hero) parts.push(`--home-hero-image:${hero}`);
  if (!parts.length) return "";
  return `:root{${parts.join(";")}}`;
}

export function effectiveHomeChromeSrc(slot: HomeChromeSlot, custom: string | null): string {
  if (custom && isSafeHomeChromeUrl(custom)) return custom;
  return HOME_CHROME_DEFAULTS[slot];
}

function readPngSize(buf: Buffer): { width: number; height: number } | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 24 || !sig.every((b, i) => buf[i] === b)) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 20000 || height > 20000) return null;
  return { width, height };
}

function readJpegSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0x00 || marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (offset + 4 > buf.length) return null;
    const len = buf.readUInt16BE(offset + 2);
    if (len < 2 || offset + 2 + len > buf.length) return null;
    const sof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (sof) {
      if (len < 7) return null;
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      if (width < 1 || height < 1) return null;
      return { width, height };
    }
    offset += 2 + len;
  }
  return null;
}

function readWebpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const tag = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (tag === "VP8X" && data + 10 <= buf.length) {
      const width = 1 + buf.readUIntLE(data + 4, 3);
      const height = 1 + buf.readUIntLE(data + 7, 3);
      if (width < 1 || height < 1) return null;
      return { width, height };
    }
    if (tag === "VP8 " && data + 10 <= buf.length) {
      if (buf[data + 3] !== 0x9d || buf[data + 4] !== 0x01 || buf[data + 5] !== 0x2a) return null;
      const width = buf.readUInt16LE(data + 6) & 0x3fff;
      const height = buf.readUInt16LE(data + 8) & 0x3fff;
      if (width < 1 || height < 1) return null;
      return { width, height };
    }
    if (tag === "VP8L" && data + 5 <= buf.length) {
      if (buf[data] !== 0x2f) return null;
      const bits = buf.readUInt32LE(data + 1);
      const width = (bits & 0x3fff) + 1;
      const height = ((bits >> 14) & 0x3fff) + 1;
      if (width < 1 || height < 1) return null;
      return { width, height };
    }
    const padded = size + (size & 1);
    if (padded < 0) return null;
    offset = data + padded;
    if (offset < data) return null;
  }
  return null;
}

export function readRasterSize(
  buf: Buffer,
  mime: "image/png" | "image/jpeg" | "image/webp"
): { width: number; height: number } | null {
  if (mime === "image/png") return readPngSize(buf);
  if (mime === "image/jpeg") return readJpegSize(buf);
  return readWebpSize(buf);
}

export function isHomeChromeSlot(value: unknown): value is HomeChromeSlot {
  return value === "sidebar" || value === "hero";
}
