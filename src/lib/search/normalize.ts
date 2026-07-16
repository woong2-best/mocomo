/**
 * 검색어 정규화 — 원본은 보존하고 분석용 키만 생성.
 * 공백·대소문자·특수문자·기본 오타(유사 문자) 정리.
 */

const TYPO_MAP: Record<string, string> = {
  감쟈: "감자",
  감저: "감자",
  튀김: "튀김",
};

export function normalizeSearchQuery(raw: string): string {
  let s = raw.normalize("NFKC").trim().toLowerCase();
  // 특수문자 제거 (한글·영문·숫자·일부 기호 유지)
  s = s.replace(/[^\p{L}\p{N}\s+#._-]/gu, "");
  s = s.replace(/\s+/g, "");
  // 반복 문자 축약 (ㅋㅋㅋ → ㅋㅋ)
  s = s.replace(/(.)\1{2,}/g, "$1$1");

  for (const [from, to] of Object.entries(TYPO_MAP)) {
    if (s.includes(from)) s = s.split(from).join(to);
  }

  return s.slice(0, 80);
}

export function clampOriginalQuery(raw: string): string {
  return raw.trim().slice(0, 120);
}

export function topicSlugFromName(name: string): string {
  return normalizeSearchQuery(name).slice(0, 64) || "topic";
}

/** Levenshtein (짧은 문자열용) */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cur = a[i] === b[j] ? row[j]! : Math.min(row[j]!, row[j + 1]!, prev) + 1;
      row[j] = prev;
      prev = cur;
    }
    row[b.length] = prev;
  }
  return row[b.length]!;
}
