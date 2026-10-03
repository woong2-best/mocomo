/**
 * 상설 메이드 카페 시드 (공통 주소·좌표 확정분)
 * - KR 대부분: `subculture-map-must-search.ts` (sync 때마다 한국어 키워드 geocode)
 * - JP/TH/TW/GB: `subculture-maid-cafe-seeds-international.ts`
 */

import { INTERNATIONAL_MAID_CAFE_SEEDS } from "@/lib/subculture-maid-cafe-seeds-international";
import type { SubcultureEventSeed } from "@/lib/subculture-event-types";

const OPEN = "2024-01-01T12:00:00+09:00";
const ENDS = "2099-12-31T23:59:59+09:00";

function maid(
  partial: Omit<SubcultureEventSeed, "category" | "startsAt" | "endsAt" | "country"> & {
    startsAt?: string;
  }
): SubcultureEventSeed {
  const { startsAt, ...rest } = partial;
  return {
    ...rest,
    country: "kr",
    category: "maid_cafe",
    startsAt: startsAt ?? OPEN,
    endsAt: ENDS,
  };
}

/** KR — must-search 목록에 없는 확정 시드만 유지 (중복 핀 방지) */
export const KR_MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  maid({
    externalKey: "venue-maid-loveangel-hongdae",
    title: "Love Angel Maid Cafe",
    description: "Permanent · near Hongdae Station",
    venueName: "Love Angel",
    address: "38 Hongik-ro 6-gil, Mapo-gu, Seoul",
    lat: 37.5558558,
    lng: 126.923797,
    sourceUrl: "https://www.instagram.com/loveangel_maidcafe/",
  }),
  maid({
    externalKey: "venue-maid-dolls-hongdae",
    title: "Dolls",
    description: "Permanent · Yeonnam · adults only (alcohol served)",
    venueName: "Dolls",
    address: "28 Yeonhui-ro 1-gil, Mapo-gu, Seoul",
    lat: 37.5602152,
    lng: 126.9255637,
    sourceUrl: "https://www.instagram.com/dolls_kor/",
    startsAt: "2024-10-23T12:00:00+09:00",
  }),
  maid({
    externalKey: "venue-maid-loreley-busan",
    title: "Lorelei Maid Cafe",
    description: "Permanent · Busan Seomyeon · gothic doll theme",
    venueName: "Lorelei",
    address: "27-8 Jungang-daero 702beon-gil, Busanjin-gu, Busan",
    lat: 35.1556551,
    lng: 129.0606777,
    sourceUrl: "https://www.instagram.com/loreley_maidcafe/",
  }),
];

export const MAID_CAFE_SEEDS: SubcultureEventSeed[] = [
  ...KR_MAID_CAFE_SEEDS,
  ...INTERNATIONAL_MAID_CAFE_SEEDS,
];
