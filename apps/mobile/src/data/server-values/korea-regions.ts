/**
 * Korean region identifiers.
 *
 * These strings are VALUES the server stores and matches against (listing `region`
 * fields, reverse-geocode labels), not UI copy. They are the only place in the app
 * source allowed to contain Hangul (see `scripts/check-no-hangul.cjs`). The UI shows
 * the English names exported alongside them.
 */

export const KOREA_SIDO = [
  { id: "seoul", label: "서울특별시", short: "서울", en: "Seoul" },
  { id: "busan", label: "부산광역시", short: "부산", en: "Busan" },
  { id: "daegu", label: "대구광역시", short: "대구", en: "Daegu" },
  { id: "incheon", label: "인천광역시", short: "인천", en: "Incheon" },
  { id: "gwangju", label: "광주광역시", short: "광주", en: "Gwangju" },
  { id: "daejeon", label: "대전광역시", short: "대전", en: "Daejeon" },
  { id: "ulsan", label: "울산광역시", short: "울산", en: "Ulsan" },
  { id: "sejong", label: "세종특별자치시", short: "세종", en: "Sejong" },
  { id: "gyeonggi", label: "경기도", short: "경기", en: "Gyeonggi" },
  { id: "gangwon", label: "강원특별자치도", short: "강원", en: "Gangwon" },
  { id: "chungbuk", label: "충청북도", short: "충북", en: "North Chungcheong" },
  { id: "chungnam", label: "충청남도", short: "충남", en: "South Chungcheong" },
  { id: "jeonbuk", label: "전북특별자치도", short: "전북", en: "North Jeolla" },
  { id: "jeonnam", label: "전라남도", short: "전남", en: "South Jeolla" },
  { id: "gyeongbuk", label: "경상북도", short: "경북", en: "North Gyeongsang" },
  { id: "gyeongnam", label: "경상남도", short: "경남", en: "South Gyeongsang" },
  { id: "jeju", label: "제주특별자치도", short: "제주", en: "Jeju" },
] as const;

/** Subset of popular districts for filter UI (full list too heavy for mobile picker). */
export const KOREA_SIGUNGU_BY_SIDO: Record<string, readonly string[]> = {
  seoul: [
    "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구",
    "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구",
    "관악구", "서초구", "강남구", "송파구", "강동구",
  ],
  busan: [
    "중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구", "사하구",
    "금정구", "강서구", "연제구", "수영구", "사상구", "기장군",
  ],
  daegu: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군"],
  incheon: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구"],
  gwangju: ["동구", "서구", "남구", "북구", "광산구"],
  daejeon: ["동구", "중구", "서구", "유성구", "대덕구"],
  ulsan: ["중구", "남구", "동구", "북구", "울주군"],
  sejong: ["세종시"],
  gyeonggi: [
    "수원시 영통구", "성남시 분당구", "성남시 수정구", "의정부시", "안양시 동안구",
    "부천시 원미구", "광명시", "고양시 일산동구", "고양시 일산서구", "용인시 수지구",
    "화성시", "김포시", "파주시", "남양주시", "하남시",
  ],
  gangwon: ["춘천시", "원주시", "강릉시", "속초시"],
  chungbuk: ["청주시 상당구", "충주시", "제천시"],
  chungnam: ["천안시 서북구", "아산시", "공주시"],
  jeonbuk: ["전주시 완산구", "군산시", "익산시"],
  jeonnam: ["목포시", "여수시", "순천시", "광양시"],
  gyeongbuk: ["포항시 북구", "경주시", "구미시", "안동시"],
  gyeongnam: ["창원시 성산구", "김해시", "진주시", "양산시"],
  jeju: ["제주시", "서귀포시"],
};

/** English display names for the districts above (same name romanizes the same in every sido). */
const SIGUNGU_EN: Record<string, string> = {
  "종로구": "Jongno-gu", "중구": "Jung-gu", "용산구": "Yongsan-gu", "성동구": "Seongdong-gu",
  "광진구": "Gwangjin-gu", "동대문구": "Dongdaemun-gu", "중랑구": "Jungnang-gu", "성북구": "Seongbuk-gu",
  "강북구": "Gangbuk-gu", "도봉구": "Dobong-gu", "노원구": "Nowon-gu", "은평구": "Eunpyeong-gu",
  "서대문구": "Seodaemun-gu", "마포구": "Mapo-gu", "양천구": "Yangcheon-gu", "강서구": "Gangseo-gu",
  "구로구": "Guro-gu", "금천구": "Geumcheon-gu", "영등포구": "Yeongdeungpo-gu", "동작구": "Dongjak-gu",
  "관악구": "Gwanak-gu", "서초구": "Seocho-gu", "강남구": "Gangnam-gu", "송파구": "Songpa-gu",
  "강동구": "Gangdong-gu", "서구": "Seo-gu", "동구": "Dong-gu", "영도구": "Yeongdo-gu",
  "부산진구": "Busanjin-gu", "동래구": "Dongnae-gu", "남구": "Nam-gu", "북구": "Buk-gu",
  "해운대구": "Haeundae-gu", "사하구": "Saha-gu", "금정구": "Geumjeong-gu", "연제구": "Yeonje-gu",
  "수영구": "Suyeong-gu", "사상구": "Sasang-gu", "기장군": "Gijang-gun", "수성구": "Suseong-gu",
  "달서구": "Dalseo-gu", "달성군": "Dalseong-gun", "미추홀구": "Michuhol-gu", "연수구": "Yeonsu-gu",
  "남동구": "Namdong-gu", "부평구": "Bupyeong-gu", "계양구": "Gyeyang-gu", "광산구": "Gwangsan-gu",
  "유성구": "Yuseong-gu", "대덕구": "Daedeok-gu", "울주군": "Ulju-gun", "세종시": "Sejong City",
  "수원시 영통구": "Suwon Yeongtong-gu", "성남시 분당구": "Seongnam Bundang-gu",
  "성남시 수정구": "Seongnam Sujeong-gu", "의정부시": "Uijeongbu", "안양시 동안구": "Anyang Dongan-gu",
  "부천시 원미구": "Bucheon Wonmi-gu", "광명시": "Gwangmyeong", "고양시 일산동구": "Goyang Ilsandong-gu",
  "고양시 일산서구": "Goyang Ilsanseo-gu", "용인시 수지구": "Yongin Suji-gu", "화성시": "Hwaseong",
  "김포시": "Gimpo", "파주시": "Paju", "남양주시": "Namyangju", "하남시": "Hanam",
  "춘천시": "Chuncheon", "원주시": "Wonju", "강릉시": "Gangneung", "속초시": "Sokcho",
  "청주시 상당구": "Cheongju Sangdang-gu", "충주시": "Chungju", "제천시": "Jecheon",
  "천안시 서북구": "Cheonan Seobuk-gu", "아산시": "Asan", "공주시": "Gongju",
  "전주시 완산구": "Jeonju Wansan-gu", "군산시": "Gunsan", "익산시": "Iksan",
  "목포시": "Mokpo", "여수시": "Yeosu", "순천시": "Suncheon", "광양시": "Gwangyang",
  "포항시 북구": "Pohang Buk-gu", "경주시": "Gyeongju", "구미시": "Gumi", "안동시": "Andong",
  "창원시 성산구": "Changwon Seongsan-gu", "김해시": "Gimhae", "진주시": "Jinju", "양산시": "Yangsan",
  "제주시": "Jeju City", "서귀포시": "Seogwipo",
};

/** Values the server stores for "ships anywhere" listings (current + legacy spelling). */
export const USED_SHIPPING_REGION = "전국 배송";
export const LEGACY_USED_SHIPPING_REGION = "전국 택배";

/** Default picker selection when no location is known (Seoul / Jongno-gu). */
export const DEFAULT_SIDO_SHORT = "서울";
export const DEFAULT_SIGUNGU = "종로구";

export function sidoEnglishName(sidoId: string): string {
  return KOREA_SIDO.find((s) => s.id === sidoId)?.en ?? sidoId;
}

export function sigunguEnglishName(sigungu: string): string {
  return SIGUNGU_EN[sigungu] ?? sigungu;
}

export function isShippingRegionValue(region: string): boolean {
  const trimmed = region.trim();
  return trimmed === USED_SHIPPING_REGION || trimmed === LEGACY_USED_SHIPPING_REGION || trimmed === "Shipping";
}

/**
 * Convert a stored region value ("서울 강남구") to its English display form
 * ("Seoul Gangnam-gu"). Unknown values are returned unchanged. The shipping
 * sentinel is handled by the caller (it needs the translator).
 */
export function regionToEnglish(region: string): string {
  const trimmed = region.trim();
  for (const sido of KOREA_SIDO) {
    if (trimmed === sido.short || trimmed === sido.label) return sido.en;
    if (trimmed.startsWith(`${sido.short} `)) {
      const rest = trimmed.slice(sido.short.length + 1).trim();
      return `${sido.en} ${sigunguEnglishName(rest)}`;
    }
  }
  return region;
}

/** Reverse-geocode label -> sido/sigungu (keep in sync with src/lib/korea-regions.ts). */
export function inferUsedRegionFromGeocodeLabel(
  label: string
): { sidoId: string; sigungu: string } | null {
  const hay = label.trim();
  if (!hay) return null;
  for (const sido of KOREA_SIDO) {
    if (!hay.includes(sido.short) && !hay.includes(sido.label)) continue;
    const units = [...(KOREA_SIGUNGU_BY_SIDO[sido.id] ?? [])];
    let best: string | null = null;
    let bestLen = 0;
    for (const unit of units) {
      if (hay.includes(unit) && unit.length > bestLen) {
        best = unit;
        bestLen = unit.length;
      }
    }
    if (best) return { sidoId: sido.id, sigungu: best };
    const fallback = units[0];
    if (fallback) return { sidoId: sido.id, sigungu: fallback };
  }
  return null;
}
