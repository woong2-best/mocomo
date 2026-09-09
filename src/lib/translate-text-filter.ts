/** Strip URLs, hashtags, and @mentions before translation eligibility checks. */
export function stripTranslationNoise(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#@][\w\u0080-\uFFFF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HANGUL_JAMO_RE = /[\u3131-\u318E\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]/;
const HANGUL_SYLLABLE_RE = /[\uAC00-\uD7AF]/;

function isEmojiOnly(text: string): boolean {
  const withoutEmoji = text.replace(/\p{Extended_Pictographic}/gu, "").replace(/\s+/g, "");
  return withoutEmoji.length === 0 && text.trim().length > 0;
}

function isSpecialCharsOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return !/\p{L}/u.test(trimmed) && !/\p{N}/u.test(trimmed);
}

/** Latin keyboard mash / laughter with very low character variety (e.g. jjjjjaa, loooool). */
function isMeaninglessLatinRepetition(text: string): boolean {
  const compact = text.replace(/\s+/g, "").toLowerCase();
  if (compact.length < 3) return true;

  const unique = new Set(compact).size;
  if (unique <= 2 && compact.length >= 4) return true;
  if (unique <= 3 && compact.length >= 6 && compact.length / unique >= 2) return true;

  return false;
}

function isJamoOnlyLaughter(text: string): boolean {
  if (HANGUL_SYLLABLE_RE.test(text)) return false;

  const jamoCount = [...text.matchAll(new RegExp(HANGUL_JAMO_RE.source, "gu"))].length;
  if (jamoCount === 0) return false;

  const letterCount = (text.match(/\p{L}/gu) ?? []).length;
  return letterCount > 0 && jamoCount / letterCount >= 0.8;
}

/**
 * Returns true when text has enough meaningful language to send to a translator.
 * Noise (jamo laughter, emoji-only, symbols, keyboard mash) stays untranslated.
 */
export function isTextWorthTranslating(text: string): boolean {
  const sample = stripTranslationNoise(text);
  if (!sample) return false;

  if (isEmojiOnly(sample)) return false;
  if (isSpecialCharsOnly(sample)) return false;

  const letters = sample.match(/\p{L}/gu) ?? [];
  if (letters.length < 2) return false;

  if (isJamoOnlyLaughter(sample)) return false;

  const latinOnly = sample.replace(/[^\p{L}]/gu, "");
  const hasNonLatinScript = /[\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]/.test(latinOnly);
  if (latinOnly && !hasNonLatinScript && isMeaninglessLatinRepetition(latinOnly)) {
    return false;
  }

  return true;
}
