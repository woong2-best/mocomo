/**
 * MoCoMo post report taxonomy (mirrored from src/lib/report-reasons.ts).
 * Keep in sync when web taxonomy changes.
 */

export type ReportReasonId =
  | "SPAM"
  | "ABUSE"
  | "HARASSMENT"
  | "HATE"
  | "VIOLENCE"
  | "FRAUD"
  | "PRIVACY"
  | "COPYRIGHT"
  | "SEXUAL"
  | "IMPERSONATION"
  | "SELF_HARM"
  | "FALSE_INFO"
  | "UNDERAGE"
  | "POLITICAL"
  | "REGULATED"
  | "OTHER";

export type ReportTaxonomyNode = {
  id: string;
  label: string;
  childQuestion?: string;
  children?: ReportTaxonomyNode[];
  reasonId?: ReportReasonId;
};

export type ReportPathStep = {
  question: string;
  node: ReportTaxonomyNode;
};

export const POST_REPORT_ROOT_QUESTION = "이 게시물을 신고하는 이유는 무엇인가요?";

export const POST_REPORT_DISCLAIMER =
  "신고된 내용은 모코모 관리팀 검토 후 신속하게 조치됩니다. 신고자의 개인정보는 안전하게 보호됩니다.";

export const POST_REPORT_REVIEW_HINT =
  "모코모 커뮤니티 가이드라인에 맞춰 검토가 진행됩니다.";

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

export function formatReportPathLabel(path: ReportPathStep[]): string {
  return path.map((s) => s.node.label).join(" › ");
}
