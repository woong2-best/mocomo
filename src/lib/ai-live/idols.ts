import { resolveIdolId, type IdolId } from "@/lib/ai-live/avatars";
import { IDOL_VRM_DEFAULTS, isSafeIdolVrmUrl } from "@/lib/ai-live/idol-vrm-shared";

export type { IdolId } from "@/lib/ai-live/avatars";

export type IdolMember = {
  id: IdolId;
  channelId: string;
  username: string;
  vrmUrl: string;
  poster: string;
  accent: string;
  nameKey: "live.idol.cleo.name" | "live.idol.mio.name" | "live.idol.nangnang.name";
  titleKey: "live.idol.cleo.title" | "live.idol.mio.title" | "live.idol.nangnang.title";
  roleKey: "live.idol.cleo.role" | "live.idol.mio.role" | "live.idol.nangnang.role";
};

/**
 * Files that exist under `public/`. Missing paths stay off this list so the browser never requests a 404.
 * Cleo is VRoid AvatarSample_B, Mio is AvatarSample_A (commercial use and redistribution allowed, credit not required).
 */
const READY_VRM_URLS = new Set<string>([
  IDOL_VRM_DEFAULTS.zelie,
  IDOL_VRM_DEFAULTS.cleo,
  IDOL_VRM_DEFAULTS.mio,
  IDOL_VRM_DEFAULTS.nangnang,
]);

function isBlobVrmPreviewUrl(url: string): boolean {
  return url.startsWith("blob:");
}

/** Already-uploaded public VRM, even if this bundle has no Supabase host to match. */
function isPublicModelVrmUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      return false;
    }
    const path = parsed.pathname.toLowerCase();
    return path.includes("/storage/v1/object/public/") && path.includes("/model/") && path.endsWith(".vrm");
  } catch {
    return false;
  }
}

/**
 * URL the VRM loader may fetch. Local admin previews use `blob:`.
 * Unknown paths are not rewritten to the old APT `default.vrm`.
 */
export function playableIdolVrmUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (isBlobVrmPreviewUrl(url)) return url;
  if (READY_VRM_URLS.has(url) || isSafeIdolVrmUrl(url) || isPublicModelVrmUrl(url)) return url;
  return null;
}

export const IDOLS: readonly IdolMember[] = [
  {
    id: "cleo",
    channelId: "idol-airi",
    username: "cleo",
    vrmUrl: "/models/airi.vrm",
    poster: "/live/idols/airi.jpg",
    accent: "#ff4d8d",
    nameKey: "live.idol.cleo.name",
    titleKey: "live.idol.cleo.title",
    roleKey: "live.idol.cleo.role",
  },
  {
    id: "mio",
    channelId: "idol-chloe",
    username: "mio",
    vrmUrl: "/models/chloe.vrm",
    poster: "/live/idols/chloe.jpg",
    accent: "#c4a574",
    nameKey: "live.idol.mio.name",
    titleKey: "live.idol.mio.title",
    roleKey: "live.idol.mio.role",
  },
  {
    id: "nangnang",
    channelId: "idol-stella",
    username: "nangnang",
    vrmUrl: "/models/nangnang.vrm",
    poster: "/live/idols/stella.jpg",
    accent: "#3ddcff",
    nameKey: "live.idol.nangnang.name",
    titleKey: "live.idol.nangnang.title",
    roleKey: "live.idol.nangnang.role",
  },
];

export function idolById(id: string | null | undefined): IdolMember | null {
  const resolved = resolveIdolId(id);
  return resolved ? (IDOLS.find((member) => member.id === resolved) ?? null) : null;
}

export function isIdolId(id: string | null | undefined): id is IdolId {
  return idolById(id) != null;
}
