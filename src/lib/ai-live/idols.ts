import { resolveIdolId, type IdolId } from "@/lib/ai-live/avatars";

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

/** Used only when a model file is not in the ready set. */
export const IDOL_VRM_FALLBACK = "/avatars/default.vrm";

/**
 * Files that exist under `public/`. Missing paths stay off this list so the browser never requests a 404.
 * Cleo is VRoid AvatarSample_B, Mio is AvatarSample_A (commercial use and redistribution allowed, credit not required).
 */
const READY_VRM_URLS = new Set<string>(["/models/airi.vrm", "/models/chloe.vrm", "/models/nangnang.vrm"]);

export function playableIdolVrmUrl(url: string | null | undefined): string {
  if (url && READY_VRM_URLS.has(url)) return url;
  return IDOL_VRM_FALLBACK;
}

export const IDOLS: readonly IdolMember[] = [
  {
    id: "cleo",
    channelId: "idol-airi",
    username: "idol_airi",
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
    username: "idol_chloe",
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
    username: "idol_stella",
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
