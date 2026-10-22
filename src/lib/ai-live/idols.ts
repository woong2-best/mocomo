export type IdolId = "airi" | "chloe" | "stella";

export type IdolMember = {
  id: IdolId;
  channelId: string;
  username: string;
  vrmUrl: string;
  poster: string;
  accent: string;
  nameKey: "live.idol.airi.name" | "live.idol.chloe.name" | "live.idol.stella.name";
  titleKey: "live.idol.airi.title" | "live.idol.chloe.title" | "live.idol.stella.title";
  roleKey: "live.idol.airi.role" | "live.idol.chloe.role" | "live.idol.stella.role";
};

/** Used only when a model file is not in the ready set. */
export const IDOL_VRM_FALLBACK = "/avatars/default.vrm";

/**
 * Files that exist under `public/`. Missing paths stay off this list so the browser never requests a 404.
 * AIRI is VRoid AvatarSample_B, CHLOE is AvatarSample_A (commercial use and redistribution allowed, credit not required).
 * STELLA is VRoid HairSample_Female (CC0).
 */
const READY_VRM_URLS = new Set<string>(["/models/airi.vrm", "/models/chloe.vrm", "/models/stella.vrm"]);

export function playableIdolVrmUrl(url: string | null | undefined): string {
  if (url && READY_VRM_URLS.has(url)) return url;
  return IDOL_VRM_FALLBACK;
}

export const IDOLS: readonly IdolMember[] = [
  {
    id: "airi",
    channelId: "idol-airi",
    username: "idol_airi",
    vrmUrl: "/models/airi.vrm",
    poster: "/live/idols/airi.jpg",
    accent: "#ff4d8d",
    nameKey: "live.idol.airi.name",
    titleKey: "live.idol.airi.title",
    roleKey: "live.idol.airi.role",
  },
  {
    id: "chloe",
    channelId: "idol-chloe",
    username: "idol_chloe",
    vrmUrl: "/models/chloe.vrm",
    poster: "/live/idols/chloe.jpg",
    accent: "#c4a574",
    nameKey: "live.idol.chloe.name",
    titleKey: "live.idol.chloe.title",
    roleKey: "live.idol.chloe.role",
  },
  {
    id: "stella",
    channelId: "idol-stella",
    username: "idol_stella",
    vrmUrl: "/models/stella.vrm",
    poster: "/live/idols/stella.jpg",
    accent: "#3ddcff",
    nameKey: "live.idol.stella.name",
    titleKey: "live.idol.stella.title",
    roleKey: "live.idol.stella.role",
  },
];

export function idolById(id: string | null | undefined): IdolMember | null {
  return IDOLS.find((member) => member.id === id) ?? null;
}

export function isIdolId(id: string | null | undefined): id is IdolId {
  return idolById(id) != null;
}
