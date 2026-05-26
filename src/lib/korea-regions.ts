/** 대한민국 시·도 / 시·군·구 (중고거래 거래 지역) */

export type SidoEntry = { id: string; label: string; short: string };

export const KOREA_SIDO: readonly SidoEntry[] = [
  { id: "seoul", label: "서울특별시", short: "서울" },
  { id: "busan", label: "부산광역시", short: "부산" },
  { id: "daegu", label: "대구광역시", short: "대구" },
  { id: "incheon", label: "인천광역시", short: "인천" },
  { id: "gwangju", label: "광주광역시", short: "광주" },
  { id: "daejeon", label: "대전광역시", short: "대전" },
  { id: "ulsan", label: "울산광역시", short: "울산" },
  { id: "sejong", label: "세종특별자치시", short: "세종" },
  { id: "gyeonggi", label: "경기도", short: "경기" },
  { id: "gangwon", label: "강원특별자치도", short: "강원" },
  { id: "chungbuk", label: "충청북도", short: "충북" },
  { id: "chungnam", label: "충청남도", short: "충남" },
  { id: "jeonbuk", label: "전북특별자치도", short: "전북" },
  { id: "jeonnam", label: "전라남도", short: "전남" },
  { id: "gyeongbuk", label: "경상북도", short: "경북" },
  { id: "gyeongnam", label: "경상남도", short: "경남" },
  { id: "jeju", label: "제주특별자치도", short: "제주" },
] as const;

/** 시·군·구 표기 (광역시는 ○○구, 경기 등은 ○○시 ○○구 / ○○군) */
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
  daegu: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"],
  incheon: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"],
  gwangju: ["동구", "서구", "남구", "북구", "광산구"],
  daejeon: ["동구", "중구", "서구", "유성구", "대덕구"],
  ulsan: ["중구", "남구", "동구", "북구", "울주군"],
  sejong: ["세종시"],
  gyeonggi: [
    "수원시 장안구", "수원시 권선구", "수원시 팔달구", "수원시 영통구",
    "성남시 수정구", "성남시 중원구", "성남시 분당구",
    "의정부시", "안양시 만안구", "안양시 동안구",
    "부천시 원미구", "부천시 소사구", "부천시 오정구",
    "광명시", "평택시", "동두천시", "안산시 상록구", "안산시 단원구",
    "고양시 덕양구", "고양시 일산동구", "고양시 일산서구",
    "과천시", "구리시", "남양주시", "오산시", "시흥시", "군포시", "의왕시", "하남시",
    "용인시 처인구", "용인시 기흥구", "용인시 수지구",
    "파주시", "이천시", "안성시", "김포시", "화성시", "광주시", "양주시", "포천시", "여주시",
    "연천군", "가평군", "양평군",
  ],
  gangwon: [
    "춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시",
    "홍천군", "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군", "고성군", "양양군",
  ],
  chungbuk: [
    "청주시 상당구", "청주시 서원구", "청주시 흥덕구", "청주시 청원구",
    "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군",
  ],
  chungnam: [
    "천안시 동남구", "천안시 서북구", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시",
    "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군",
  ],
  jeonbuk: [
    "전주시 완산구", "전주시 덕진구", "군산시", "익산시", "정읍시", "남원시", "김제시",
    "완주군", "진안군", "무주군", "장수군", "임실군", "순창군", "고창군", "부안군",
  ],
  jeonnam: [
    "목포시", "여수시", "순천시", "나주시", "광양시",
    "담양군", "곡성군", "구례군", "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군",
    "무안군", "함평군", "영광군", "장성군", "완도군", "진도군", "신안군",
  ],
  gyeongbuk: [
    "포항시 남구", "포항시 북구", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시", "문경시", "경산시",
    "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군",
  ],
  gyeongnam: [
    "창원시 의창구", "창원시 성산구", "창원시 마산합포구", "창원시 마산회원구", "창원시 진해구",
    "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시",
    "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군",
  ],
  jeju: ["제주시", "서귀포시"],
};

export const USED_SHIPPING_REGION = "전국 택배" as const;

export function formatUsedRegion(sidoShort: string, sigungu: string): string {
  if (sigungu === USED_SHIPPING_REGION) return USED_SHIPPING_REGION;
  return `${sidoShort} ${sigungu}`;
}

export function getAllUsedRegions(): string[] {
  const list: string[] = [];
  for (const sido of KOREA_SIDO) {
    const units = KOREA_SIGUNGU_BY_SIDO[sido.id] ?? [];
    for (const unit of units) {
      list.push(formatUsedRegion(sido.short, unit));
    }
  }
  list.push(USED_SHIPPING_REGION);
  return list;
}

const _regionSet = new Set(getAllUsedRegions());

export function isValidUsedRegion(region: string): boolean {
  return _regionSet.has(region.trim());
}

export function parseUsedRegion(region: string): { sidoId: string; sigungu: string } | null {
  const trimmed = region.trim();
  if (trimmed === USED_SHIPPING_REGION) {
    return { sidoId: "__shipping__", sigungu: USED_SHIPPING_REGION };
  }
  for (const sido of KOREA_SIDO) {
    const prefix = `${sido.short} `;
    if (trimmed.startsWith(prefix)) {
      const sigungu = trimmed.slice(prefix.length);
      const units = KOREA_SIGUNGU_BY_SIDO[sido.id] ?? [];
      if (units.includes(sigungu)) return { sidoId: sido.id, sigungu };
    }
  }
  return null;
}

export function getSigunguList(sidoId: string): readonly string[] {
  if (sidoId === "__shipping__") return [USED_SHIPPING_REGION];
  return KOREA_SIGUNGU_BY_SIDO[sidoId] ?? [];
}

export function getSidoById(sidoId: string): SidoEntry | undefined {
  return KOREA_SIDO.find((s) => s.id === sidoId);
}

/** 시·도 전체 필터용 — DB region 값이 `서울 강남구` 형식일 때 접두사 */
export function getSidoRegionPrefix(sidoId: string): string | null {
  const sido = getSidoById(sidoId);
  return sido ? `${sido.short} ` : null;
}
