export const USED_CARROT_ORANGE = "#FF6F0F";

export const USED_CATEGORIES = [
  { id: "DIGITAL", label: "디지털/가전", emoji: "📱" },
  { id: "FIGURE", label: "피규어/프라모", emoji: "🎎" },
  { id: "GOODS", label: "굿즈/콜렉", emoji: "✨" },
  { id: "COSPLAY", label: "코스프레/의상", emoji: "👗" },
  { id: "BOOK", label: "도서/음반", emoji: "📚" },
  { id: "FASHION", label: "패션/잡화", emoji: "👜" },
  { id: "OTHER", label: "기타", emoji: "📦" },
] as const;

export const USED_REGIONS = [
  "서울 강남구",
  "서울 서초구",
  "서울 마포구",
  "서울 송파구",
  "서울 용산구",
  "경기 성남시",
  "경기 수원시",
  "경기 고양시",
  "인천 부평구",
  "부산 해운대구",
  "대구 수성구",
  "대전 유성구",
  "광주 서구",
  "전국 택배",
] as const;

export function usedCategoryLabel(id: string) {
  return USED_CATEGORIES.find((c) => c.id === id)?.label ?? "기타";
}

export function formatUsedPrice(price: number) {
  if (price === 0) return "나눔";
  return `${price.toLocaleString()}원`;
}

export function formatUsedTimeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

export function usedStatusLabel(status: string) {
  if (status === "RESERVED") return "예약중";
  if (status === "SOLD") return "거래완료";
  return "";
}

export function listingImages(images: unknown): string[] {
  if (Array.isArray(images)) return images.filter((x): x is string => typeof x === "string");
  return [];
}
