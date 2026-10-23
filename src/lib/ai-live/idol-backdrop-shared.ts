/** Live VRM room backdrops. Built-in files stay in /public/live/backgrounds. */

export const IDOL_BACKDROP_KEY = "site.idolBackdrop";

export const IDOL_BACKDROP_SLOTS = ["moco", "airi", "chloe", "stella"] as const;

export type IdolBackdropSlot = (typeof IDOL_BACKDROP_SLOTS)[number];

export type IdolBackdropUrls = Record<IdolBackdropSlot, string | null>;

export const IDOL_BACKDROP_DEFAULTS: Record<IdolBackdropSlot, string | null> = {
  moco: "/live/backgrounds/moco-room.jpg",
  airi: "/live/backgrounds/airi-room.jpg",
  chloe: "/live/backgrounds/chloe-room.jpg",
  stella: null,
};

const DEFAULT_PATHS = new Set(
  Object.values(IDOL_BACKDROP_DEFAULTS).filter((path): path is string => Boolean(path)),
);

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

export function isIdolBackdropSlot(value: unknown): value is IdolBackdropSlot {
  return typeof value === "string" && (IDOL_BACKDROP_SLOTS as readonly string[]).includes(value);
}

/** New public names still read the stored moco/airi/chloe/stella slots. */
export function backdropSlotForAvatar(value: string | null | undefined): IdolBackdropSlot | null {
  const id = value?.trim().toLowerCase();
  if (!id) return null;
  if (id === "zelie" || id === "moco") return "moco";
  if (id === "cleo" || id === "airi") return "airi";
  if (id === "mio" || id === "chloe") return "chloe";
  if (id === "nangnang" || id === "stella") return "stella";
  return isIdolBackdropSlot(id) ? id : null;
}

export function isSafeIdolBackdropUrl(url: string): boolean {
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

export function isCustomIdolBackdropUrl(url: string): boolean {
  return isSafeIdolBackdropUrl(url) && !DEFAULT_PATHS.has(url);
}

export function emptyIdolBackdropUrls(): IdolBackdropUrls {
  return { moco: null, airi: null, chloe: null, stella: null };
}

export function parseIdolBackdropValue(value: unknown): IdolBackdropUrls {
  const next = emptyIdolBackdropUrls();
  if (!value || typeof value !== "object" || Array.isArray(value)) return next;
  const row = value as Record<string, unknown>;
  for (const slot of IDOL_BACKDROP_SLOTS) {
    const raw = row[slot];
    next[slot] = typeof raw === "string" && isCustomIdolBackdropUrl(raw) ? raw : null;
  }
  return next;
}

export function effectiveIdolBackdropUrl(slot: IdolBackdropSlot, custom: string | null): string | null {
  if (custom && isSafeIdolBackdropUrl(custom)) return custom;
  return IDOL_BACKDROP_DEFAULTS[slot];
}

export function effectiveIdolBackdropMap(custom: IdolBackdropUrls): Record<IdolBackdropSlot, string | null> {
  return {
    moco: effectiveIdolBackdropUrl("moco", custom.moco),
    airi: effectiveIdolBackdropUrl("airi", custom.airi),
    chloe: effectiveIdolBackdropUrl("chloe", custom.chloe),
    stella: effectiveIdolBackdropUrl("stella", custom.stella),
  };
}
