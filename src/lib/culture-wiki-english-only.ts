/** Reject Culture Wiki edits that are mostly non-Latin (en-only authoring policy). */

export const CULTURE_WIKI_ENGLISH_ONLY_ERROR = "wiki.error.englishOnly";

const NON_LATIN_LETTER =
  /[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u1100-\u11ff\u0400-\u04ff\u0600-\u06ff]/g;
const LATIN_LETTER = /[A-Za-z]/g;

function letterStats(text: string) {
  const nonLatin = (text.match(NON_LATIN_LETTER) ?? []).length;
  const latin = (text.match(LATIN_LETTER) ?? []).length;
  return { nonLatin, latin, total: nonLatin + latin };
}

/** Returns error code when combined wiki fields fail the English-only check. */
export function cultureWikiEnglishOnlyViolation(
  fields: Array<string | null | undefined>
): string | null {
  const combined = fields.map((f) => (f ?? "").trim()).filter(Boolean).join("\n");
  if (!combined) return null;
  const { nonLatin, latin, total } = letterStats(combined);
  if (total === 0) return null;
  if (latin === 0 && nonLatin > 0) return CULTURE_WIKI_ENGLISH_ONLY_ERROR;
  if (nonLatin / total > 0.15) return CULTURE_WIKI_ENGLISH_ONLY_ERROR;
  return null;
}
