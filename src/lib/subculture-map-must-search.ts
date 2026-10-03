/**
 * 서브컬처 지도 — 필수 검색 대상 (행사장 마스터와 동일하게 sync 때마다 geocode·upsert)
 * name / city / address 는 Nominatim 검색 키워드 (한국어 유지)
 */

import type { SubcultureEventCountry } from "@/lib/subculture-event-countries";
import type { FetchedSubcultureEvent } from "@/lib/subculture-event-fetch/types";
import { SUBCULTURE_MAP_MUST_SEARCH_INTL } from "@/lib/subculture-map-must-search-intl";
import { isPinCoordinateValid } from "@/lib/subculture-event-geocode";

export type SubcultureMapMustSearchEntry = {
  /** 검색·표시용 상호 (현지어) */
  name: string;
  category: "maid_cafe";
  country: SubcultureEventCountry;
  /** 행정 구역·도시 (검색 보조) */
  city: string;
  /** 도로명·층 */
  address: string;
  note?: string;
  /** stable id suffix — 생략 시 name에서 생성 */
  id?: string;
  /** 확정 좌표 — geocode 실패 시에도 지도에 표시 */
  lat?: number;
  lng?: number;
  sourceUrl?: string;
};

const OPEN = "2024-01-01T12:00:00+09:00";
const ENDS = "2099-12-31T23:59:59+09:00";

export function slugifyMustSearchName(name: string): string {
  const cleaned = name
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .slice(0, 56);
  return cleaned || "place";
}

export function mustSearchExternalKey(entry: SubcultureMapMustSearchEntry): string {
  const slug = entry.id ?? slugifyMustSearchName(entry.name);
  if (entry.country === "tw") {
    const region = entry.city.includes("台中")
      ? "taichung"
      : entry.city.includes("高雄")
        ? "kaohsiung"
        : "taipei";
    return `must-search-tw-maid-${region}-${slug}`;
  }
  if (entry.country === "us") {
    return `must-search-us-maid-${slug}`;
  }
  const region = entry.city.includes("부산")
    ? "busan"
    : entry.city.includes("대구")
      ? "daegu"
      : entry.city.includes("수원")
        ? "suwon"
        : "seoul";
  return `must-search-kr-maid-${region}-${slug}`;
}

/** KR 시드에서 이전한 확정 좌표 (geocode 보조) */
const KR_MUST_SEARCH_FALLBACK_COORDS: Record<string, { lat: number; lng: number }> = {
  kiraring: { lat: 35.1537751, lng: 129.0652953 },
  "gakkou-tomo": { lat: 35.1537905, lng: 129.0672449 },
  kuroheart: { lat: 35.1555099, lng: 129.0600667 },
  "mochi-cos": { lat: 35.1573217, lng: 129.061811 },
  dream: { lat: 35.1543148, lng: 129.0618196 },
  teitaku: { lat: 35.1525823, lng: 129.0584061 },
  "maidmoon-seomyeon": { lat: 35.1545913, lng: 129.0605085 },
  naraka: { lat: 35.8678621, lng: 128.5978869 },
  maidreamin: { lat: 37.5522169, lng: 126.9203449 },
  "maji-tenshi": { lat: 37.5503279, lng: 126.921658 },
  ohmy: { lat: 37.5531433, lng: 126.9219999 },
  "maji-devi": { lat: 37.5503279, lng: 126.921658 },
  "moemoekyun-matsuri": { lat: 37.5474108, lng: 126.9172952 },
  "moemoekyun-devil": { lat: 37.5474108, lng: 126.9172952 },
  elysion: { lat: 37.55024, lng: 126.9226954 },
  "dokidoki-hongdae": { lat: 37.5527813, lng: 126.9229411 },
  maidpia: { lat: 37.5553944, lng: 126.9252733 },
  kawaii: { lat: 37.5500916, lng: 126.9233722 },
  ayana: { lat: 37.5512, lng: 126.921864 },
  moemoekyun: { lat: 37.5474108, lng: 126.9172952 },
  "maidmoon-hongdae": { lat: 37.5522194, lng: 126.9209507 },
};

function resolvedMustSearchCoords(entry: SubcultureMapMustSearchEntry): {
  lat: number;
  lng: number;
} | null {
  if (
    entry.lat != null &&
    entry.lng != null &&
    isPinCoordinateValid(entry.country, entry.lat, entry.lng)
  ) {
    return { lat: entry.lat, lng: entry.lng };
  }
  if (entry.id && entry.country === "kr") {
    const fb = KR_MUST_SEARCH_FALLBACK_COORDS[entry.id];
    if (fb && isPinCoordinateValid("kr", fb.lat, fb.lng)) return fb;
  }
  return null;
}

/** 상설 메이드 카페 — 국내 필수 검색 목록 */
const SUBCULTURE_MAP_MUST_SEARCH_KR: SubcultureMapMustSearchEntry[] = [
  {
    name: "키라링",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산진구 동성로25길 35 2층",
    note: "Address needs checking: no city/province prefix; 동성로 is often Daegu — verify",
    id: "kiraring",
  },
  {
    name: "하이코우",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 서전로68번길 27 3층",
  },
  {
    name: "갓코우 토모",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 서전로68번길 51 3층",
    note: "Also known as 갓코우카페",
    id: "gakkou-tomo",
  },
  {
    name: "쿠로하트",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 중앙대로702번길 15 지하1층",
    id: "kuroheart",
  },
  {
    name: "스펑키",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 서전로58번길 40 지하1층",
  },
  {
    name: "코이",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 동천로 72 2층",
  },
  {
    name: "모찌 코스",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 동천로95번길 8 2층",
    id: "mochi-cos",
  },
  {
    name: "드림",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 중앙대로692번길 46 지하1층",
    id: "dream",
  },
  {
    name: "슈가레이스",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 서전로10번길 34 2층",
  },
  {
    name: "테이타쿠",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 신천대로62번길 71 3층",
    id: "teitaku",
  },
  {
    name: "메이드문 서면",
    category: "maid_cafe",
    country: "kr",
    city: "부산 부산진구",
    address: "부산 부산진구 중앙대로692번길 21 2층",
    id: "maidmoon-seomyeon",
  },
  {
    name: "도키도키 수원",
    category: "maid_cafe",
    country: "kr",
    city: "수원시 팔달구",
    address: "수원시 팔달구 덕영대로905 아이메카빌딩 2층",
    id: "dokidoki-suwon",
  },
  {
    name: "유메데빌",
    category: "maid_cafe",
    country: "kr",
    city: "대구 중구",
    address: "대구 중구 동성로2길 18-14 지하 1층",
  },
  {
    name: "나라카",
    category: "maid_cafe",
    country: "kr",
    city: "대구 중구",
    address: "대구 중구 동성로3길 38 3층",
    id: "naraka",
  },
  {
    name: "유메이드",
    category: "maid_cafe",
    country: "kr",
    city: "대구 중구",
    address: "대구 중구 동성로2길 18-16 지하1층",
  },
  {
    name: "마이니치",
    category: "maid_cafe",
    country: "kr",
    city: "대구 중구",
    address: "대구 중구 동성로 11 4층",
  },
  {
    name: "메이드리밍",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 잔다리로6길 28-1",
    id: "maidreamin",
  },
  {
    name: "마지텐시",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로17길 24 2층",
    note: "Same address as 마지데비 — different shop or relocated",
    id: "maji-tenshi",
  },
  {
    name: "오마이",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 어울마당로 92 지하1층",
    id: "ohmy",
  },
  {
    name: "마지데비",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로17길 24 2층",
    note: "Same address as 마지텐시 — different shop or relocated",
    id: "maji-devi",
  },
  {
    name: "메이드카페 큐",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울특별시 마포구 어울마당로5길 7, 4층",
    id: "maid-cafe-q",
  },
  {
    name: "모에모에큥 마츠리",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 독막로6길 18 1층",
    id: "moemoekyun-matsuri",
  },
  {
    name: "모에모에큥 데빌",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 독막로6길 16 3층",
    id: "moemoekyun-devil",
  },
  {
    name: "엘리시온",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로17길 6",
    id: "elysion",
  },
  {
    name: "도키도키",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로21길 20-10 2층",
    id: "dokidoki-hongdae",
  },
  {
    name: "오르타 저택",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 어울마당로 49 3층",
    id: "orta-teitaku",
  },
  {
    name: "메이드피아",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울특별시 마포구 와우산로27길 64, 3층",
    id: "maidpia",
  },
  {
    name: "메로하우스",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 홍익로6길 21",
    note: "Same address as 로제린",
    id: "melo-house",
  },
  {
    name: "도키도키 데빌",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로18길 38 지하1층",
    id: "dokidoki-devil",
  },
  {
    name: "아이란도",
    category: "maid_cafe",
    country: "kr",
    city: "서울 서대문구",
    address: "서울 서대문구 연세로11길 5",
    note: "Sinchon area, Seodaemun-gu",
    id: "irland-o",
  },
  {
    name: "누아르",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울특별시 마포구 와우산로29라길 11 1.5층",
  },
  {
    name: "달링",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 어울마당로 59 3층",
  },
  {
    name: "로제린",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 홍익로6길 21",
    note: "Same address as 메로하우스",
    id: "roserin",
  },
  {
    name: "라이브온",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 어울마당로5길 6",
  },
  {
    name: "카와이",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로14길 4",
    id: "kawaii",
  },
  {
    name: "아야나",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로19길 21",
    id: "ayana",
  },
  {
    name: "모에모에 이세계",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로27길 64 2층",
    note: "Same building as 메이드피아 (different floor)",
    id: "moemoe-isekai",
  },
  {
    name: "데뷔탕트",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로29라길 13-6",
  },
  {
    name: "모에모에큥",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 독막로6길 16 2층",
    id: "moemoekyun",
  },
  {
    name: "멜티엔젤",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로29라길 20",
  },
  {
    name: "마이바니",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울특별시 마포구 와우산로29길 15",
  },
  {
    name: "아이란도 라운지",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 어울마당로 44-1 4층",
    id: "irland-o-lounge",
  },
  {
    name: "히라루",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 독막로3길 21 2층",
  },
  {
    name: "데레데레",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 와우산로11길 9-10 2층",
  },
  {
    name: "도키 777",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울 마포구 어울마당로 60 5층",
    id: "doki-777",
  },
  {
    name: "메이드문",
    category: "maid_cafe",
    country: "kr",
    city: "서울 마포구",
    address: "서울특별시 마포구 잔다리로6길 34 2층",
    id: "maidmoon-hongdae",
  },
];

export const SUBCULTURE_MAP_MUST_SEARCH: SubcultureMapMustSearchEntry[] = [
  ...SUBCULTURE_MAP_MUST_SEARCH_KR,
  ...SUBCULTURE_MAP_MUST_SEARCH_INTL,
];

export function mustSearchGeocodeQuery(entry: SubcultureMapMustSearchEntry): {
  venueName: string;
  address: string;
} {
  const venueName = entry.name.trim();
  const address = entry.address.trim();
  if (entry.country === "kr") {
    const withCity =
      address.startsWith(entry.city.trim()) ||
      address.includes("서울") ||
      address.includes("부산") ||
      address.includes("대구") ||
      address.includes("수원")
        ? address
        : `${entry.city.trim()} ${address}`;
    return { venueName, address: withCity };
  }
  if (address.includes(entry.city.trim()) || address.includes("台灣") || address.includes("USA")) {
    return { venueName, address };
  }
  return { venueName, address: `${entry.city.trim()} ${address}` };
}

export function mustSearchEntryToFetchedEvent(
  entry: SubcultureMapMustSearchEntry
): FetchedSubcultureEvent {
  const { venueName, address } = mustSearchGeocodeQuery(entry);
  const description = entry.note
    ? `Permanent maid cafe · ${entry.note}`
    : `Permanent maid cafe · ${entry.city}`;
  const coords = resolvedMustSearchCoords(entry);
  return {
    sourceId: "must-search",
    country: entry.country,
    externalKey: mustSearchExternalKey(entry),
    title: venueName,
    description,
    category: entry.category,
    venueName,
    address,
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
    startsAt: OPEN,
    endsAt: ENDS,
    sourceUrl: entry.sourceUrl ?? "https://mocomo.net/events/map",
  };
}

export function getMustSearchFetchedSubcultureEvents(): FetchedSubcultureEvent[] {
  return SUBCULTURE_MAP_MUST_SEARCH.map(mustSearchEntryToFetchedEvent);
}
