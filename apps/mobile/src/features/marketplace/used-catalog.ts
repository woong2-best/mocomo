/** Used-market catalog constants for mobile (mirrors web). */

import { formatPrice } from "@/lib/money";

export const USED_CATEGORIES = [
  { id: "DIGITAL", label: "디지털/가전" },
  { id: "FIGURE", label: "피규어/프라모" },
  { id: "GOODS", label: "굿즈/콜렉" },
  { id: "COSPLAY", label: "코스프레/의상" },
  { id: "BOOK", label: "도서/음반" },
  { id: "FASHION", label: "패션/잡화" },
  { id: "OTHER", label: "기타" },
] as const;

export const USED_PRODUCT_TYPES = [
  { id: "FIGURE", label: "피규어" },
  { id: "PLAMODEL", label: "프라모델" },
  { id: "PLUSH", label: "인형·봉제" },
  { id: "STATUE", label: "등신대·스태츄" },
  { id: "ACRYLIC_STAND", label: "아크릴 스탠드" },
  { id: "CAN_BADGE", label: "캔뱃지" },
  { id: "KEYRING", label: "키링" },
  { id: "COSPLAY_COSTUME", label: "코스프레 의상" },
  { id: "WIG", label: "가발" },
  { id: "TCG_CARD", label: "카드 (TCG·일반)" },
  { id: "TCG_POKEMON", label: "포켓몬 카드" },
  { id: "TCG_YGO", label: "유희왕" },
  { id: "TCG_MTG", label: "매직 (MTG)" },
  { id: "TCG_ONEPIECE", label: "원피스 카드" },
  { id: "TCG_OTHER", label: "기타 TCG" },
  { id: "PHOTOCARD", label: "포토카드" },
  { id: "DOUJIN", label: "동인지" },
  { id: "ARTBOOK", label: "아트북" },
  { id: "BOARDGAME", label: "보드게임" },
  { id: "VTUBER_GOODS", label: "VTuber 굿즈" },
  { id: "EVENT_GOODS", label: "행사·한정 굿즈" },
  { id: "BOOK", label: "만화·라노벨" },
  { id: "MEDIA", label: "CD/DVD/블루레이" },
  { id: "OTHER", label: "기타" },
] as const;

export const KOREA_SIDO = [
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

export const USED_SHIPPING_REGION = "전국 택배";

export function formatUsedRegion(sidoShort: string, sigungu: string) {
  if (sigungu === USED_SHIPPING_REGION) return USED_SHIPPING_REGION;
  return `${sidoShort} ${sigungu}`;
}

export function formatUsedPrice(price: number, currency?: string | null) {
  if (price === 0) return "나눔";
  return formatPrice(price, currency ?? "krw");
}

export function formatUsedTimeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}주 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

export function usedStatusLabel(status: string) {
  switch (status) {
    case "SELLING":
      return "판매중";
    case "RESERVED":
      return "예약중";
    case "SOLD":
      return "거래완료";
    default:
      return status;
  }
}

export function productTypeLabel(id: string | null | undefined): string {
  if (!id) return "";
  return USED_PRODUCT_TYPES.find((p) => p.id === id)?.label ?? id;
}
