/** 이메일 인증·비밀번호 찾기용 도메인 (Gmail만 빠른 선택) */
export const SIGNUP_EMAIL_DOMAINS = [{ value: "gmail.com", label: "Gmail" }] as const;

export const SIGNUP_EMAIL_QUICK_PICKS = ["gmail.com"] as const;

export function getSignupDomainLabel(value: string): string {
  const found = SIGNUP_EMAIL_DOMAINS.find((d) => d.value === value);
  return found?.label ?? value;
}

export const SIGNUP_EMAIL_CUSTOM_DOMAIN = "__custom__";

const LOCAL_PART_RE = /^[a-zA-Z0-9._+-]+$/;
const DOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

export function isKnownSignupDomain(domain: string): boolean {
  return SIGNUP_EMAIL_DOMAINS.some((d) => d.value === domain);
}

export function buildSignupEmail(
  localPart: string,
  domain: string,
  customDomain?: string
): string | null {
  const local = localPart.trim().toLowerCase();
  if (!local || !LOCAL_PART_RE.test(local)) return null;

  const rawDomain =
    domain === SIGNUP_EMAIL_CUSTOM_DOMAIN
      ? (customDomain ?? "").trim().toLowerCase()
      : domain.trim().toLowerCase();

  if (!rawDomain || !DOMAIN_RE.test(rawDomain)) return null;
  return `${local}@${rawDomain}`;
}

export function parseSignupEmail(email: string): {
  localPart: string;
  domain: string;
  customDomain: string;
} {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) {
    return { localPart: "", domain: "gmail.com", customDomain: "" };
  }
  const localPart = normalized.slice(0, at);
  const host = normalized.slice(at + 1);
  if (isKnownSignupDomain(host)) {
    return { localPart, domain: host, customDomain: "" };
  }
  return {
    localPart,
    domain: SIGNUP_EMAIL_CUSTOM_DOMAIN,
    customDomain: host,
  };
}

export function isValidSignupEmail(email: string): boolean {
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1) return false;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return buildSignupEmail(local, domain) !== null;
}

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function isGmailAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return GMAIL_DOMAINS.has(email.slice(at + 1).trim().toLowerCase());
}

export function isValidGmailSignupEmail(email: string): boolean {
  return isValidSignupEmail(email) && isGmailAddress(email);
}

export const GMAIL_DOMAIN = "gmail.com";
export const NAVER_DOMAIN = "naver.com";

const NAVER_DOMAINS = new Set([NAVER_DOMAIN]);

/** 로컬 파트만 입력했을 때 Gmail 주소 조합 */
export function buildGmailEmail(localPart: string): string | null {
  return buildSignupEmail(localPart, GMAIL_DOMAIN);
}

export function isNaverAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return NAVER_DOMAINS.has(email.slice(at + 1).trim().toLowerCase());
}

export function isValidNaverSignupEmail(email: string): boolean {
  return isValidSignupEmail(email) && isNaverAddress(email);
}

export function buildNaverEmail(localPart: string): string | null {
  return buildSignupEmail(localPart, NAVER_DOMAIN);
}

export function parseNaverLocalPart(emailOrLocal: string): string {
  const normalized = emailOrLocal.trim().toLowerCase();
  if (!normalized) return "";
  const at = normalized.indexOf("@");
  if (at < 0) return normalized;
  const host = normalized.slice(at + 1);
  if (NAVER_DOMAINS.has(host)) return normalized.slice(0, at);
  return normalized.slice(0, at);
}

/** 전체 주소 또는 로컬 파트에서 @ 앞부분만 추출 (Gmail 로그인 입력용) */
export function parseGmailLocalPart(emailOrLocal: string): string {
  const normalized = emailOrLocal.trim().toLowerCase();
  if (!normalized) return "";
  const at = normalized.indexOf("@");
  if (at < 0) return normalized;
  const host = normalized.slice(at + 1);
  if (GMAIL_DOMAINS.has(host)) return normalized.slice(0, at);
  return normalized.slice(0, at);
}
