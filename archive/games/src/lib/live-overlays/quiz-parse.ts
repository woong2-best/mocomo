/** 채팅으로 퀴즈·단어 맞히기 답 파싱 */

export function normalizeLiveGameAnswer(text: string): string {
  return text
    .trim()
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** 1~4, !1~!4, A~D, O/X(2지선다) */
export function parseQuizChoiceAnswer(text: string, optionCount: number): number | null {
  const raw = text.trim();
  const bare = raw.replace(/^!/, "");
  if (/^[1-4]$/.test(bare)) {
    const idx = parseInt(bare, 10) - 1;
    if (idx >= 0 && idx < optionCount) return idx;
  }
  const letter = bare.toUpperCase();
  const letterMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  if (letter in letterMap && letterMap[letter]! < optionCount) return letterMap[letter]!;

  if (optionCount === 2) {
    const n = normalizeLiveGameAnswer(raw);
    if (n === "o" || n === "ㅇ" || n === "오" || n === "yes" || n === "y") return 0;
    if (n === "x" || n === "엑스" || n === "no" || n === "n") return 1;
  }
  return null;
}

export function isWordGuessCorrect(guess: string, answer: string, aliases?: string[]): boolean {
  const g = normalizeLiveGameAnswer(guess);
  if (!g) return false;
  const targets = [answer, ...(aliases ?? [])].map(normalizeLiveGameAnswer);
  return targets.some((t) => t === g);
}
