/** Client + server 공용 — `"use server"` 파일에서 객체를 export하면 Next.js가 거부함 */

/** Flat reason ids used for risk scoring + API validation */
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
  { id: "SELF_HARM", label: "자살·자해" },
  { id: "FALSE_INFO", label: "거짓 정보" },
  { id: "UNDERAGE", label: "미성년자 관련" },
  { id: "POLITICAL", label: "정치적 허위·조작" },
  { id: "REGULATED", label: "규제 품목" },
  { id: "OTHER", label: "기타" },
] as const;

export type ReportReasonId = (typeof REPORT_REASONS)[number]["id"];

export const REPORT_REASON_IDS = REPORT_REASONS.map((r) => r.id) as [
  ReportReasonId,
  ...ReportReasonId[],
];

export type ReportTaxonomyNode = {
  id: string;
  label: string;
  /** Question shown when selecting among this node's children */
  childQuestion?: string;
  children?: ReportTaxonomyNode[];
  /** Leaf → maps to risk-scoring reason */
  reasonId?: ReportReasonId;
};

/**
 * MoCoMo post report tree — Instagram-style hierarchy, wording adapted for posts
 * (광고 → 게시물, 광고주 규정 → 커뮤니티 가이드라인).
 */
export const POST_REPORT_ROOT_QUESTION =
  "이 게시물을 신고하는 이유는 무엇인가요?";

export const POST_REPORT_DISCLAIMER =
  "신고된 내용은 모코모 관리팀 검토 후 신속하게 조치됩니다. 신고자의 개인정보는 안전하게 보호됩니다.";

export const POST_REPORT_REVIEW_HINT =
  "모코모 커뮤니티 가이드라인에 맞춰 검토가 진행됩니다.";

/** Flat MoCoMo community report categories (order matters). */
export const POST_REPORT_TAXONOMY: ReportTaxonomyNode[] = [
  { id: "spam_fraud", label: "스팸 / 불법 홍보 / 사기", reasonId: "FRAUD" },
  { id: "abuse_hate", label: "욕설 / 비방 / 혐오 표현", reasonId: "HATE" },
  { id: "sexual", label: "성인용 / 음란성 콘텐츠", reasonId: "SEXUAL" },
  {
    id: "privacy_ip",
    label: "개인정보 노출 및 지적재산권 침해",
    reasonId: "PRIVACY",
  },
  { id: "false_info", label: "허위 사실 및 거짓 정보", reasonId: "FALSE_INFO" },
  { id: "other", label: "기타 문제", reasonId: "OTHER" },
];

export type ReportPathStep = {
  question: string;
  node: ReportTaxonomyNode;
};

export function findTaxonomyNode(
  nodes: ReportTaxonomyNode[],
  id: string
): ReportTaxonomyNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findTaxonomyNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function formatReportPathLabel(path: ReportPathStep[]): string {
  return path.map((s) => s.node.label).join(" › ");
}

export function isReportReasonId(value: string): value is ReportReasonId {
  return REPORT_REASON_IDS.includes(value as ReportReasonId);
}
