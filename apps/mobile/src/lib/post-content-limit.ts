/**
 * Keep in sync with `src/lib/post-content-limit.ts`.
 * General (platform) posts only — QnA compose must not import this for limits.
 */

export const GENERAL_POST_MAX_GRAPHEMES = 350;

export const GENERAL_POST_TOO_LONG_ERROR = "m.compose.content_too_long";

const FALLBACK_GRAPHEME_RE =
  /(?:\p{RI}\p{RI})|(?:[0-9#*]\u{FE0F}?\u{20E3})|(?:\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F}|\u{FE0E})?(?:\u{200D}\p{Extended_Pictographic}(?:\p{Emoji_Modifier}|\u{FE0F}|\u{FE0E})?)*)|(?:\P{M}\p{M}*)|(?:.)/gsu;

let cachedSegmenter: Intl.Segmenter | null | undefined;

function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  cachedSegmenter =
    typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  return cachedSegmenter;
}

export function countGraphemeClusters(text: string): number {
  if (!text) return 0;
  const segmenter = getGraphemeSegmenter();
  if (segmenter) {
    return [...segmenter.segment(text)].length;
  }
  return text.match(FALLBACK_GRAPHEME_RE)?.length ?? 0;
}

export function remainingGeneralPostGraphemes(text: string): number {
  return GENERAL_POST_MAX_GRAPHEMES - countGraphemeClusters(text);
}

export function isGeneralPostOverGraphemeLimit(text: string): boolean {
  return countGraphemeClusters(text) > GENERAL_POST_MAX_GRAPHEMES;
}
