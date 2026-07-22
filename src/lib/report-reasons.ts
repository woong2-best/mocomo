/** Client + server 공용 — `"use server"` 파일에서 객체를 export하면 Next.js가 거부함 */
export const REPORT_REASONS = [
  { id: "SPAM", label: "스팸·광고" },
  { id: "ABUSE", label: "욕설·괴롭힘" },
  { id: "HARASSMENT", label: "괴롭힘" },
  { id: "HATE", label: "혐오 표현" },
  { id: "VIOLENCE", label: "폭력" },
  { id: "FRAUD", label: "사기·불법 거래" },
  { id: "PRIVACY", label: "개인정보" },
  { id: "COPYRIGHT", label: "저작권" },
  { id: "SEXUAL", label: "음란물" },
  { id: "IMPERSONATION", label: "사칭" },
  { id: "OTHER", label: "기타" },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];
