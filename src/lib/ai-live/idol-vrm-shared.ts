/** Live avatar VRM models. Built-in files stay in /public/avatars and /public/models. */

import { LIVE_AVATAR_IDS, resolveLiveAvatarId, type LiveAvatarId } from "@/lib/ai-live/avatars";

export const IDOL_VRM_KEY = "site.idolVrm";

export const IDOL_VRM_SLOTS = LIVE_AVATAR_IDS;

export type IdolVrmSlot = LiveAvatarId;

export type IdolVrmUrls = Record<IdolVrmSlot, string | null>;

export const IDOL_VRM_DEFAULTS: Record<IdolVrmSlot, string> = {
  zelie: "/avatars/zelie.vrm",
  cleo: "/models/airi.vrm",
  mio: "/models/chloe.vrm",
  nangnang: "/models/nangnang.vrm",
};

export const IDOL_VRM_MAX_BYTES = 32 * 1024 * 1024;

const DEFAULT_PATHS = new Set(Object.values(IDOL_VRM_DEFAULTS));

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

export function isIdolVrmSlot(value: unknown): value is IdolVrmSlot {
  return typeof value === "string" && (IDOL_VRM_SLOTS as readonly string[]).includes(value);
}

/** New public names still read the stored zelie/cleo/mio/nangnang slots. */
export function vrmSlotForAvatar(value: string | null | undefined): IdolVrmSlot | null {
  return resolveLiveAvatarId(value);
}

export function isSafeIdolVrmUrl(url: string): boolean {
  if (!url || url.length > MAX_URL_LENGTH) return false;
  if (DEFAULT_PATHS.has(url) || url === "/avatars/default.vrm") return true;
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
  return parsed.pathname.includes("/storage/v1/object/public/") && parsed.pathname.toLowerCase().includes("/model/");
}

export function isCustomIdolVrmUrl(url: string): boolean {
  return isSafeIdolVrmUrl(url) && !DEFAULT_PATHS.has(url) && url !== "/avatars/default.vrm";
}

export function emptyIdolVrmUrls(): IdolVrmUrls {
  return { zelie: null, cleo: null, mio: null, nangnang: null };
}

export function parseIdolVrmValue(value: unknown): IdolVrmUrls {
  const next = emptyIdolVrmUrls();
  if (!value || typeof value !== "object" || Array.isArray(value)) return next;
  const row = value as Record<string, unknown>;
  for (const slot of IDOL_VRM_SLOTS) {
    const raw = row[slot];
    next[slot] = typeof raw === "string" && isCustomIdolVrmUrl(raw) ? raw : null;
  }
  return next;
}

export function effectiveIdolVrmUrl(slot: IdolVrmSlot, custom: string | null): string {
  if (custom && isSafeIdolVrmUrl(custom)) return custom;
  return IDOL_VRM_DEFAULTS[slot];
}

export function effectiveIdolVrmMap(custom: IdolVrmUrls): Record<IdolVrmSlot, string> {
  return {
    zelie: effectiveIdolVrmUrl("zelie", custom.zelie),
    cleo: effectiveIdolVrmUrl("cleo", custom.cleo),
    mio: effectiveIdolVrmUrl("mio", custom.mio),
    nangnang: effectiveIdolVrmUrl("nangnang", custom.nangnang),
  };
}

export function isGltfBinary(buf: ArrayBuffer | Uint8Array | Buffer): boolean {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  if (bytes.length < 4) return false;
  return bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;
}
