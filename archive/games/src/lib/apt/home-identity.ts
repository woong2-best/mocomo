import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { BONDEE_FURNITURE_LABELS, type BondeeHomeState, type BondeePlacedItem } from "@/lib/apt/bondee/types";

/** 집의 성격·분위기 아키타입 */
export type HomeIdentityArchetype =
  | "gamer"
  | "musician"
  | "cosplayer"
  | "streamer"
  | "collector"
  | "creator"
  | "cafe"
  | "minimal"
  | "cozy";

export type AptHomeIdentity = {
  /** 수동 선택 (없으면 가구 기반 자동 추론) */
  archetype?: HomeIdentityArchetype;
  /** 대표 태그 — 최대 4개 */
  tags: string[];
  /** 한 줄 소개 — 방문자에게 보임 */
  tagline?: string;
  /** 대표 공간 (room id) */
  showcaseRoomId?: string;
  /** 대표 가구/작품 (item id) */
  showcaseItemId?: string;
};

export type HomeIdentitySummary = {
  archetype: HomeIdentityArchetype;
  archetypeLabel: string;
  tags: string[];
  tagline: string;
  showcaseRoomId?: string;
  showcaseItemId?: string;
  showcaseRoomLabel?: string;
  showcaseItemLabel?: string;
};

export const IDENTITY_ARCHETYPE_LABELS: Record<HomeIdentityArchetype, string> = {
  gamer: "게이머 집",
  musician: "음악가 집",
  cosplayer: "코스어 집",
  streamer: "방송인 집",
  collector: "수집가 집",
  creator: "창작자 집",
  cafe: "카페 스타일",
  minimal: "미니멀",
  cozy: "아늑한 집",
};

export const IDENTITY_TAG_PRESETS: { id: string; label: string; archetype?: HomeIdentityArchetype }[] = [
  { id: "gamer", label: "#게이머", archetype: "gamer" },
  { id: "music", label: "#음악", archetype: "musician" },
  { id: "cosplay", label: "#코스프레", archetype: "cosplayer" },
  { id: "stream", label: "#방송", archetype: "streamer" },
  { id: "cafe", label: "#카페", archetype: "cafe" },
  { id: "collect", label: "#수집", archetype: "collector" },
  { id: "create", label: "#창작", archetype: "creator" },
  { id: "minimal", label: "#미니멀", archetype: "minimal" },
  { id: "cozy", label: "#아늑", archetype: "cozy" },
];

const INSTRUMENT_KINDS = new Set([
  "gramophone",
  "acoustic_guitar",
  "electric_guitar",
  "bass_guitar",
  "violin",
  "cello",
  "harp",
  "piano",
  "upright_piano",
  "grand_piano",
  "synthesizer",
  "marimba",
  "drum_set",
  "synthesizer",
  "saxophone",
  "trumpet",
]);

export const DEFAULT_HOME_IDENTITY: AptHomeIdentity = {
  tags: [],
};

export function normalizeHomeIdentity(raw: unknown): AptHomeIdentity {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HOME_IDENTITY };
  const o = raw as AptHomeIdentity;
  return {
    archetype: o.archetype,
    tags: Array.isArray(o.tags) ? o.tags.slice(0, 4) : [],
    tagline: typeof o.tagline === "string" ? o.tagline.slice(0, 48) : undefined,
    showcaseRoomId: o.showcaseRoomId,
    showcaseItemId: o.showcaseItemId,
  };
}

export function inferArchetypeFromHome(home: BondeeHomeState): HomeIdentityArchetype {
  const items = home.items ?? [];
  const kinds = items.map((i) => i.kind);

  if (kinds.some((k) => k === "monitor" || k === "computer" || k === "tv_stand")) {
    if (kinds.filter((k) => INSTRUMENT_KINDS.has(k)).length >= 2) return "musician";
    return "gamer";
  }
  if (kinds.filter((k) => INSTRUMENT_KINDS.has(k)).length >= 2) return "musician";
  if (kinds.some((k) => INSTRUMENT_KINDS.has(k))) return "musician";
  if (kinds.filter((k) => k === "bookshelf" || k === "shelf_small").length >= 2) return "collector";
  if (kinds.some((k) => k === "desk" || k === "computer")) return "creator";
  if (kinds.some((k) => k === "coffee_table" || k === "sofa") && items.length >= 8) return "cafe";
  if (items.length <= 5) return "minimal";
  if (kinds.some((k) => k === "plant" || k === "rug" || k === "floor_lamp")) return "cozy";
  return "cozy";
}

export function defaultTagsForArchetype(archetype: HomeIdentityArchetype): string[] {
  const map: Record<HomeIdentityArchetype, string[]> = {
    gamer: ["#게이머"],
    musician: ["#음악"],
    cosplayer: ["#코스프레"],
    streamer: ["#방송"],
    collector: ["#수집"],
    creator: ["#창작"],
    cafe: ["#카페"],
    minimal: ["#미니멀"],
    cozy: ["#아늑"],
  };
  return map[archetype] ?? [];
}

export function resolveHomeIdentity(home: BondeeHomeState, rooms: AptRoom[] = []): HomeIdentitySummary {
  const identity = normalizeHomeIdentity(home.identity);
  const archetype = identity.archetype ?? inferArchetypeFromHome(home);
  const tags = identity.tags.length ? identity.tags : defaultTagsForArchetype(archetype);

  const showcaseRoomId =
    identity.showcaseRoomId ??
    home.activeRoomId ??
    rooms.find((r) => r.type === "living")?.id ??
    rooms[0]?.id;

  let showcaseItemId = identity.showcaseItemId;
  if (!showcaseItemId && showcaseRoomId) {
    const inRoom = home.items.filter((i) => i.roomId === showcaseRoomId);
    showcaseItemId = pickShowcaseItem(inRoom)?.id;
  }

  const showcaseRoom = rooms.find((r) => r.id === showcaseRoomId);
  const showcaseItem = home.items.find((i) => i.id === showcaseItemId);

  const tagline =
    identity.tagline?.trim() ||
    `${IDENTITY_ARCHETYPE_LABELS[archetype]} — ${tags.slice(0, 2).join(" ")}`;

  return {
    archetype,
    archetypeLabel: IDENTITY_ARCHETYPE_LABELS[archetype],
    tags,
    tagline,
    showcaseRoomId,
    showcaseItemId,
    showcaseRoomLabel: showcaseRoom?.label ?? showcaseRoom?.id,
    showcaseItemLabel: showcaseItem ? BONDEE_FURNITURE_LABELS[showcaseItem.kind] : undefined,
  };
}

function pickShowcaseItem(items: BondeePlacedItem[]): BondeePlacedItem | undefined {
  const priority = [
    "grand_piano",
    "upright_piano",
    "piano",
    "tv_stand",
    "monitor",
    "computer",
    "gramophone",
    "acoustic_guitar",
    "bookshelf",
    "sofa",
    "desk",
    "floor_lamp",
  ];
  for (const kind of priority) {
    const found = items.find((i) => i.kind === kind);
    if (found) return found;
  }
  return items[0];
}

export function roomLabelFor(rooms: AptRoom[], roomId?: string) {
  if (!roomId) return undefined;
  return rooms.find((r) => r.id === roomId)?.label ?? roomId;
}

export function formatIdentityBrief(summary: HomeIdentitySummary): string {
  return `${summary.archetypeLabel} · ${summary.tags.slice(0, 2).join(" ")}`;
}
