/** 한글 실명 비교 — 공백·특수문자 제거 후 일치 여부 */
export function normalizeKrPersonName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase();
}

/** 예금주명과 로그인 실명(네이버 등) 100% 일치 — 부분일치 허용 안 함 */
export function bankHolderMatchesLegalName(holderName: string, legalName: string): boolean {
  const h = normalizeKrPersonName(holderName);
  const l = normalizeKrPersonName(legalName);
  if (!h || !l) return false;
  return h === l;
}
