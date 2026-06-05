/** 본문에서 @username 멘션 추출 (중복 제거, 소문자 비교는 DB 조회 시 처리) */
export function extractMentionUsernames(text: string): string[] {
  const matches = text.matchAll(/@([a-zA-Z0-9_]{2,30})/g);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    const u = m[1]?.toLowerCase();
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(m[1]!);
    }
  }
  return out;
}
