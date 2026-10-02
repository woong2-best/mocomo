/** 한글 초성 추출 — 초성 퀴즈용 */

const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

function syllableToChosung(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const initial = Math.floor((code - 0xac00) / 588);
    return CHOSUNG[initial] ?? "";
  }
  if (char === " ") return " ";
  if (/[a-zA-Z0-9]/.test(char)) return char.toUpperCase();
  return "";
}

/** "원피스" → "ㅇㅍㅅ", "진격의 거인" → "ㅈㄱㅇ ㄱㅇ" */
export function toChosung(text: string): string {
  const parts: string[] = [];
  let chunk = "";

  for (const char of text.normalize("NFKC")) {
    if (char === " " || char === "\t") {
      if (chunk) {
        parts.push(chunk);
        chunk = "";
      }
      continue;
    }
    const c = syllableToChosung(char);
    if (c && c !== " ") chunk += c;
  }
  if (chunk) parts.push(chunk);
  return parts.join(" ");
}
