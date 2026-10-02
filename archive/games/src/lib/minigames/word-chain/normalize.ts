import { WORD_CHAIN_MAX_LEN, WORD_CHAIN_MIN_LEN } from "./types";

/** 보이지 않는 공백·제어문자 제거 후 NFC 정규화 */
export function normalizeWordChainWord(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u202F\u205F\u3000]/g, "")
    .replace(/[\r\n\t\f\v\u0085\u2028\u2029]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

export function isHangulWord(text: string): boolean {
  return /^[가-힣]+$/.test(text);
}

export function wordChainNextRequiredChar(currentWord: string | null): string | null {
  if (!currentWord) return null;
  const w = normalizeWordChainWord(currentWord);
  if (!w) return null;
  return w[w.length - 1]!;
}

export function checkWordChainFormat(normalized: string): string | null {
  if (!normalized) return "단어를 입력하세요.";
  if (normalized.length < WORD_CHAIN_MIN_LEN) return "2글자 이상 입력하세요.";
  if (normalized.length > WORD_CHAIN_MAX_LEN) return `${WORD_CHAIN_MAX_LEN}글자 이하로 입력하세요.`;
  if (!isHangulWord(normalized)) return "한글(가~힣)만 입력 가능합니다.";
  return null;
}

export function toDictEntry(word: string, type = "명사"): import("./types").WordChainDictEntry {
  const w = normalizeWordChainWord(word);
  return {
    word: w,
    firstChar: w[0]!,
    lastChar: w[w.length - 1]!,
    type,
  };
}
