export const LOCALES = ["ko", "en", "ja", "zh"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "mocomo_locale";
export const COUNTRY_COOKIE = "mocomo_country";

/** 비로그인 방문자 기본값 */
export const DEFAULT_GUEST_LOCALE: Locale = "en";
export const DEFAULT_GUEST_COUNTRY = "US";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

/** ISO 3166-1 alpha-2 — 회원가입·프로필용 */
export const COUNTRIES = [
  { code: "KR", nameKo: "대한민국", nameEn: "South Korea" },
  { code: "US", nameKo: "미국", nameEn: "United States" },
  { code: "JP", nameKo: "일본", nameEn: "Japan" },
  { code: "CN", nameKo: "중국", nameEn: "China" },
  { code: "TW", nameKo: "대만", nameEn: "Taiwan" },
  { code: "TH", nameKo: "태국", nameEn: "Thailand" },
  { code: "VN", nameKo: "베트남", nameEn: "Vietnam" },
  { code: "PH", nameKo: "필리핀", nameEn: "Philippines" },
  { code: "ID", nameKo: "인도네시아", nameEn: "Indonesia" },
  { code: "GB", nameKo: "영국", nameEn: "United Kingdom" },
  { code: "DE", nameKo: "독일", nameEn: "Germany" },
  { code: "FR", nameKo: "프랑스", nameEn: "France" },
  { code: "CA", nameKo: "캐나다", nameEn: "Canada" },
  { code: "AU", nameKo: "호주", nameEn: "Australia" },
  { code: "OTHER", nameKo: "기타", nameEn: "Other" },
] as const;

export function countryFlag(code: string): string {
  const c = code.toUpperCase();
  if (c === "OTHER" || c.length !== 2) return "🌐";
  const points = [...c].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value?: string | null, fallback: Locale = "ko"): Locale {
  if (value && isLocale(value)) return value;
  return fallback;
}

export function countryDisplayName(code: string, locale: Locale): string {
  const c = COUNTRIES.find((row) => row.code === code);
  if (!c) return code;
  return locale === "ko" ? c.nameKo : c.nameEn;
}
