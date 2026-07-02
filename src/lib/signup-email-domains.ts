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
