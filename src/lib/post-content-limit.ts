/**
 * General (platform) post body limit — Twitter/X-style visible characters.
 *
 * Count rule: each user-visible unit is 1 — spaces, newlines, punctuation,
 * and emoji (including ZWJ families, skin tones, flags). Implemented via
 * Unicode grapheme clusters (`Intl.Segmenter`), not UTF-16 `.length`.
 *
 * Scope: only posts with no `communityId`. QnA / community posts, comments,
 * DMs, market listings, and other surfaces are intentionally uncapped here.
 *
 * Persistence: Postgres `TEXT` is UTF-8, so emoji persist without utf8mb4
 * migrations. Never byte-truncate or `String.prototype.slice` this field —
 * that can split surrogates / grapheme clusters.
 */

export const GENERAL_POST_MAX_GRAPHEMES = 350;

export const GENERAL_POST_TOO_LONG_ERROR = "compose.contentTooLong";

const FALLBACK_GRAPHEME_RE =
  /(?:\p{RI}\p{RI})|(?:[0-9#*]\u{FE0F}?\u{20E3})|(?:\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F}|\u{FE0E})?(?:\u{200D}\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F}|\u{FE0E})?)*)|(?:\P{M}\p{M}*)|(?:.)/gu;

let cachedSegmenter: Intl.Segmenter | null | undefined;

function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  cachedSegmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  return cachedSegmenter;
}

export function iterateGraphemes(text: string): string[] {
  if (!text) return [];
  const segmenter = getGraphemeSegmenter();
  if (segmenter) {
    return [...segmenter.segment(text)].map((part) => part.segment);
  }
  return text.match(FALLBACK_GRAPHEME_RE) ?? [];
}

export function countGraphemeClusters(text: string): number {
  if (!text) return 0;
  const segmenter = getGraphemeSegmenter();
  if (segmenter) {
    return [...segmenter.segment(text)].length;
  }
  return iterateGraphemes(text).length;
}

export function remainingGeneralPostGraphemes(text: string): number {
  return GENERAL_POST_MAX_GRAPHEMES - countGraphemeClusters(text);
}

export function isGeneralPostOverGraphemeLimit(text: string): boolean {
  return countGraphemeClusters(text) > GENERAL_POST_MAX_GRAPHEMES;
}

/** True only for platform / home-feed posts. QnA passes a community id. */
export function isGeneralPostContentLimited(
  communityId?: string | null
): boolean {
  return !communityId?.trim();
}

/**
 * Server + client guard. Returns a catalog key when a general post exceeds
 * 350 graphemes. QnA (`communityId` set) always returns null.
 */
export function validateGeneralPostContentLength(
  content: string,
  communityId?: string | null
): string | null {
  if (!isGeneralPostContentLimited(communityId)) return null;
  if (countGraphemeClusters(content) > GENERAL_POST_MAX_GRAPHEMES) {
    return GENERAL_POST_TOO_LONG_ERROR;
  }
  return null;
}
