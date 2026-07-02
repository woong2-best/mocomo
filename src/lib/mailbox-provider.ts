export type MailboxProvider = "microsoft" | "apple" | "google" | "other";

const MICROSOFT_DOMAINS = new Set([
  "outlook.com",
  "outlook.co.kr",
  "outlook.jp",
  "hotmail.com",
  "hotmail.co.kr",
  "live.com",
  "live.co.kr",
  "msn.com",
]);

const APPLE_DOMAINS = new Set(["icloud.com", "me.com", "mac.com"]);

const GOOGLE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function getMailboxProviderFromEmail(email: string): MailboxProvider {
  const at = email.lastIndexOf("@");
  if (at < 0) return "other";
  return getMailboxProviderFromDomain(email.slice(at + 1));
}

export function getMailboxProviderFromDomain(domain: string): MailboxProvider {
  const host = domain.trim().toLowerCase();
  if (MICROSOFT_DOMAINS.has(host)) return "microsoft";
  if (APPLE_DOMAINS.has(host)) return "apple";
  if (GOOGLE_DOMAINS.has(host)) return "google";
  return "other";
}
