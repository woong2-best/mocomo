/** 회원가입 시 선택 가능한 이메일 도메인 */
export const SIGNUP_EMAIL_DOMAINS = [
  { value: "naver.com", label: "네이버" },
  { value: "gmail.com", label: "Gmail" },
  { value: "daum.net", label: "다음" },
  { value: "hanmail.net", label: "한메일" },
  { value: "kakao.com", label: "카카오" },
  { value: "nate.com", label: "네이트" },
  { value: "outlook.com", label: "Outlook" },
  { value: "hotmail.com", label: "Hotmail" },
  { value: "live.com", label: "Live" },
  { value: "yahoo.com", label: "Yahoo" },
  { value: "yahoo.co.kr", label: "Yahoo Korea" },
  { value: "icloud.com", label: "iCloud" },
  { value: "me.com", label: "iCloud (me.com)" },
  { value: "proton.me", label: "Proton" },
  { value: "protonmail.com", label: "ProtonMail" },
  { value: "aol.com", label: "AOL" },
] as const;

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
    return { localPart: "", domain: SIGNUP_EMAIL_DOMAINS[0].value, customDomain: "" };
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
