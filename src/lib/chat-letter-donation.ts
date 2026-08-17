/** DM letter-donation marker — sync with apps/mobile/src/lib/chat-letter-donation.ts */

export const LETTER_DONATION_MARKER_PREFIX = "[[mocomo:letter-donation:";
export const LETTER_DONATION_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:letter-donation:([a-z0-9]+)\]\]/i;

export function letterDonationMarker(tipId: string): string {
  return `${LETTER_DONATION_MARKER_PREFIX}${tipId}${LETTER_DONATION_MARKER_SUFFIX}`;
}

export function parseLetterDonationMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const match = content.trim().match(MARKER_RE);
  return match?.[1] ?? null;
}

export function stripLetterDonationMarker(content: string | null | undefined): string | null {
  if (!content?.trim()) return null;
  const stripped = content.replace(MARKER_RE, "").trim();
  return stripped || null;
}

export function buildLetterDonationMessageBody(tipId: string): string {
  return `${letterDonationMarker(tipId)}\n💌 편지 후원이 도착했습니다.`;
}

export { LETTER_DONATION_MIN_USD_CENTS as LETTER_DONATION_MIN_KRW } from "@/lib/money";
export const LETTER_DONATION_MESSAGE_MAX = 500;
