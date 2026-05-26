/** 한국 휴대폰 번호 정규화·검증 (중고거래 인증) */

const KR_MOBILE = /^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/;

/** E.164 +8210xxxxxxxx */
export function normalizeKrPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("82")) {
    const rest = digits.slice(2);
    if (rest.length >= 10 && rest.length <= 11 && rest.startsWith("10")) {
      return `+82${rest}`;
    }
  }
  if (digits.startsWith("010") && digits.length === 11) {
    return `+82${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("10")) {
    return `+82${digits}`;
  }
  return null;
}

/** 화면 표시용 010-1234-5678 */
export function formatKrPhoneDisplay(e164: string): string {
  const d = e164.replace(/\D/g, "");
  const local = d.startsWith("82") ? `0${d.slice(2)}` : d;
  if (local.length === 11) {
    return `${local.slice(0, 3)}-${local.slice(3, 7)}-${local.slice(7)}`;
  }
  return e164;
}

export function isValidKrMobileInput(input: string): boolean {
  const compact = input.replace(/\s/g, "");
  if (!KR_MOBILE.test(compact)) return false;
  return normalizeKrPhone(input) !== null;
}
