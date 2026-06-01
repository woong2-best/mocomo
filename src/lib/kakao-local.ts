/** 카카오 로컬 API — KAKAO_REST_API_KEY (서버 전용) */

export type KakaoCoord = { lat: number; lng: number; label: string };

export class KakaoLocalNotConfiguredError extends Error {
  constructor() {
    super("KAKAO_REST_API_KEY가 설정되지 않았습니다.");
    this.name = "KakaoLocalNotConfiguredError";
  }
}

export function getKakaoRestApiKey(): string {
  return process.env.KAKAO_REST_API_KEY?.trim() ?? "";
}

export function isKakaoLocalConfigured(): boolean {
  return !!getKakaoRestApiKey();
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 33 &&
    lat <= 39.5 &&
    lng >= 124 &&
    lng <= 132
  );
}

function kakaoHeaders(key: string) {
  return { Authorization: `KakaoAK ${key}` };
}

type KakaoDoc = {
  y: string;
  x: string;
  place_name?: string;
  address_name?: string;
  road_address_name?: string;
};

function docToCoord(doc: KakaoDoc, fallbackLabel: string): KakaoCoord | null {
  const lat = parseFloat(doc.y);
  const lng = parseFloat(doc.x);
  if (!isValidCoord(lat, lng)) return null;
  const label =
    doc.place_name?.trim() ||
    doc.road_address_name?.trim() ||
    doc.address_name?.trim() ||
    fallbackLabel;
  return { lat, lng, label };
}

async function kakaoLocalSearch(
  path: "keyword" | "address",
  query: string
): Promise<KakaoCoord | null> {
  const key = getKakaoRestApiKey();
  if (!key) throw new KakaoLocalNotConfiguredError();

  const url = `https://dapi.kakao.com/v2/local/search/${path}.json?query=${encodeURIComponent(query)}&size=5`;
  const res = await fetch(url, {
    headers: kakaoHeaders(key),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("카카오 API 키가 올바르지 않거나 Local API 권한이 없습니다.");
  }
  if (!res.ok) return null;

  const data = (await res.json()) as { documents?: KakaoDoc[] };
  const doc = data.documents?.[0];
  if (!doc) return null;
  return docToCoord(doc, query);
}

/** 장소명·주소 검색 (키워드 → 주소 순) */
export async function kakaoSearchPlace(query: string): Promise<KakaoCoord | null> {
  const q = query.trim();
  if (!q) return null;

  const byKeyword = await kakaoLocalSearch("keyword", q);
  if (byKeyword) return byKeyword;

  return kakaoLocalSearch("address", q);
}

/** 좌표 → 주소 (핀 이동 시 장소명 자동 입력) */
export async function kakaoCoordToAddress(lat: number, lng: number): Promise<string | null> {
  const key = getKakaoRestApiKey();
  if (!key) throw new KakaoLocalNotConfiguredError();

  const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;
  const res = await fetch(url, {
    headers: kakaoHeaders(key),
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    documents?: {
      road_address?: { address_name?: string; building_name?: string };
      address?: { address_name?: string };
    }[];
  };

  const doc = data.documents?.[0];
  if (!doc) return null;

  const road = doc.road_address;
  if (road?.address_name) {
    const building = road.building_name?.trim();
    return building ? `${road.address_name} ${building}` : road.address_name;
  }
  return doc.address?.address_name?.trim() ?? null;
}

export async function kakaoGeocodeMeetPlace(
  region: string,
  meetPlace?: string | null
): Promise<KakaoCoord | null> {
  const q = [meetPlace?.trim(), region].filter(Boolean).join(" ");
  if (!q.trim()) return null;
  return kakaoSearchPlace(q);
}
