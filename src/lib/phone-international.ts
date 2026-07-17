import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { formatKrPhoneDisplay } from "@/lib/phone";

function isMobileType(type: string | undefined): boolean {
  if (!type) return true;
  return type === "MOBILE" || type === "FIXED_LINE_OR_MOBILE" || type === "PERSONAL_NUMBER";
}

/** 국가 코드에 맞는 휴대폰 번호 → E.164 (+...) */
export function normalizeMobilePhone(input: string, countryCode: string): string | null {
  const region = countryCode.toUpperCase() as CountryCode;
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed = parsePhoneNumberFromString(trimmed, region);
  if (!parsed?.isValid() && trimmed.startsWith("+")) {
    parsed = parsePhoneNumberFromString(trimmed);
  }
  if (!parsed?.isValid()) return null;

  const type = parsed.getType();
  if (type && !isMobileType(type)) return null;

  const parsedCountry = parsed.country?.toUpperCase();
  if (parsedCountry && parsedCountry !== region) return null;

  return parsed.number;
}

export function isValidMobilePhoneInput(input: string, countryCode: string): boolean {
  return normalizeMobilePhone(input, countryCode) !== null;
}

export function formatPhoneDisplay(e164: string): string {
  if (e164.startsWith("+82")) return formatKrPhoneDisplay(e164);
  const parsed = parsePhoneNumberFromString(e164);
  if (parsed?.isValid()) return parsed.formatInternational();
  return e164;
}

export function phonePlaceholderForCountry(countryCode: string): string {
  switch (countryCode.toUpperCase()) {
    case "KR":
      return "010-1234-5678";
    case "US":
      return "(555) 123-4567";
    case "JP":
      return "090-1234-5678";
    case "CN":
      return "138 0013 8000";
    case "HK":
      return "5123 4567";
    case "GB":
      return "07123 456789";
    default:
      return "+XX XXX XXX XXXX";
  }
}

export function phoneInputHintForCountry(countryCode: string, locale: "ko" | "en" = "ko"): string {
  const cc = countryCode.toUpperCase();
  if (locale === "en") {
    return `Enter a mobile number registered in ${cc}. International format (+...) is also accepted.`;
  }
  return `${cc} 휴대폰 번호를 입력해 주세요. (+ 국제 형식도 가능)`;
}
