/** DM letter-donation markers — sync with src/lib/chat-letter-donation.ts */

export const LETTER_DONATION_MARKER_PREFIX = "[[mocomo:letter-donation:";
export const LETTER_DONATION_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:letter-donation:([a-z0-9]+)\]\]/i;

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

export const LETTER_DONATION_MIN_KRW = 500;
/** DM letter donations are paid in purchased MOCO (1 MOCO min). */
export const LETTER_DONATION_MIN_MOCO = 1;
export const LETTER_DONATION_MESSAGE_MAX = 500;
