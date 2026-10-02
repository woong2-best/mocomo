import type { StickerAssetDef } from "./sticker-types";

const BASE = "/diorama/stickers/living";

function w(id: string, label: string, defaultWidth: number, category: StickerAssetDef["category"], extra?: Partial<StickerAssetDef>): StickerAssetDef {
  return { id, src: `${BASE}/${id}.webp`, label, defaultWidth, category, ...extra };
}

/** 거실 스티커 카탈로그 — 투명 WebP, 통일 그림체 */
export const STICKER_CATALOG: Record<string, StickerAssetDef> = {
  "room-shell": w("room-shell", "방 껍데기", 900, "room"),
  door: w("door", "현관문", 110, "room", { function: "room-portal", functionLabel: "다른 방" }),
  window: w("window", "창문", 130, "room"),

  sofa: w("sofa", "소파", 200, "furniture"),
  bed: w("bed", "침대", 220, "furniture"),
  tv: w("tv", "TV", 120, "functional", { function: "live-tv", functionLabel: "라이브 방송" }),
  desk: w("desk", "책상", 160, "furniture"),
  chair: w("chair", "의자", 70, "furniture"),
  plant: w("plant", "식물", 80, "decor"),
  rug: w("rug", "러그", 240, "decor"),
  frame: w("frame", "액자", 70, "decor"),
  "frame-small": w("frame-small", "小액자", 55, "decor"),
  lamp: w("lamp", "조명", 60, "lighting"),
  books: w("books", "책", 50, "prop"),
  doll: w("doll", "인형", 55, "prop"),
  shelf: w("shelf", "선반", 140, "furniture"),
  poster: w("poster", "포스터", 90, "decor"),
  "coffee-table": w("coffee-table", "테이블", 120, "furniture"),
  cushion: w("cushion", "쿠션", 45, "prop"),
  mug: w("mug", "머그", 35, "prop"),
  clock: w("clock", "시계", 55, "decor"),
  bookshelf: w("bookshelf", "책장", 150, "furniture"),
  mascot: w("mascot", "주인", 90, "character"),
  "mascot-sit": w("mascot-sit", "주인(앉음)", 85, "character"),
  vase: w("vase", "화병", 40, "prop"),
  slippers: w("slippers", "슬리퍼", 50, "prop"),
  remote: w("remote", "리모컨", 30, "prop"),
  candle: w("candle", "초", 32, "prop"),
  magazine: w("magazine", "잡지", 42, "prop"),
  polaroid: w("polaroid", "폴라로이드", 38, "prop"),
  garland: w("garland", "가랜드", 180, "decor"),
  basket: w("basket", "바구니", 75, "prop"),
  gamepad: w("gamepad", "게임패드", 40, "prop"),
  "snack-plate": w("snack-plate", "간식", 45, "prop"),
  "hanging-plant": w("hanging-plant", "행잉 플랜트", 70, "decor"),

  mailbox: w("mailbox", "우편함", 75, "functional", { function: "mailbox", functionLabel: "메시지" }),
  telephone: w("telephone", "전화기", 65, "functional", { function: "phone", functionLabel: "통화" }),
  computer: w("computer", "컴퓨터", 140, "functional", { function: "community", functionLabel: "커뮤니티" }),
  wardrobe: w("wardrobe", "옷장", 130, "functional", { function: "avatar-edit", functionLabel: "아바타" }),
  mirror: w("mirror", "거울", 80, "functional", { function: "profile-edit", functionLabel: "프로필" }),
};

export function getStickerAsset(id: string): StickerAssetDef | undefined {
  return STICKER_CATALOG[id];
}

export function isFunctionalAsset(id: string): boolean {
  return !!STICKER_CATALOG[id]?.function;
}
