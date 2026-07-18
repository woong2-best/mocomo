/** 판매자 표시용 업체코드 (예: M01750336) */
export function formatSellerCode(profileId: string): string {
  const compact = profileId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const tail = (compact.slice(-8) || "XXXXXXXX").padStart(8, "0");
  return `M${tail}`;
}
