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
  "신고는 익명으로 처리됩니다. 누군가 위급한 상황에 있다고 생각되면 즉시 현지 응급 서비스에 연락하세요.";

export const POST_REPORT_REVIEW_HINT =
  "MoCoMo 커뮤니티 가이드라인을 위반하는 콘텐츠만 삭제됩니다. 아래에서 신고 상세 정보를 검토하거나 수정할 수 있습니다.";

export const POST_REPORT_TAXONOMY: ReportTaxonomyNode[] = [
  {
    id: "scam",
    label: "스캠·사기 또는 사칭",
    childQuestion: "다음 중 문제를 가장 잘 설명하는 항목은 무엇인가요?",
    children: [
      {
        id: "scam_false",
        label: "거짓 또는 사기",
        childQuestion: "어떤 종류의 거짓 또는 사기인가요?",
        children: [
          { id: "scam_finance", label: "금융 또는 신원 사기", reasonId: "FRAUD" },
          { id: "scam_celeb_endorse", label: "유명인 사칭·허위 보증", reasonId: "IMPERSONATION" },
          { id: "scam_misleading", label: "오해의 소지가 있는 제품 또는 서비스", reasonId: "FRAUD" },
          { id: "scam_gambling", label: "도박 사기", reasonId: "FRAUD" },
        ],
      },
      {
        id: "scam_impersonation",
        label: "사칭",
        childQuestion: "어떤 유형의 사칭인가요?",
        children: [
          { id: "scam_fake_account", label: "가짜 계정·브랜드 사칭", reasonId: "IMPERSONATION" },
          { id: "scam_celeb_fake", label: "유명인 사칭·허위 보증", reasonId: "IMPERSONATION" },
        ],
      },
      { id: "scam_spam", label: "스팸", reasonId: "SPAM" },
    ],
  },
  { id: "political", label: "정치적 허위·조작 콘텐츠", reasonId: "POLITICAL" },
  {
    id: "adult",
    label: "성인용 콘텐츠",
    childQuestion: "어떤 유형의 성인용 콘텐츠인가요?",
    children: [
      { id: "adult_threat_share", label: "나체 이미지를 공유하거나 공유하겠다는 위협", reasonId: "SEXUAL" },
      { id: "adult_sex_work", label: "성매매인 것 같음", reasonId: "SEXUAL" },
      { id: "adult_abuse", label: "성적 학대인 것 같음", reasonId: "SEXUAL" },
      { id: "adult_nude", label: "나체 이미지 또는 성적 행위", reasonId: "SEXUAL" },
    ],
  },
  {
    id: "regulated",
    label: "규제 품목의 판매 또는 홍보",
    childQuestion: "무엇이 판매 또는 홍보되고 있나요?",
    children: [
      {
        id: "regulated_drugs",
        label: "약물",
        childQuestion: "어떤 종류의 약물인가요?",
        children: [
          { id: "regulated_drugs_hard", label: "코카인·헤로인·펜타닐 등 고위험 약물", reasonId: "REGULATED" },
          { id: "regulated_drugs_rx", label: "처방약", reasonId: "REGULATED" },
          { id: "regulated_drugs_other", label: "기타 불법·위험 약물", reasonId: "REGULATED" },
        ],
      },
      { id: "regulated_weapons", label: "무기", reasonId: "REGULATED" },
      { id: "regulated_animals", label: "동물", reasonId: "REGULATED" },
    ],
  },
  {
    id: "violence",
    label: "폭력·혐오 또는 학대",
    childQuestion: "어떤 유형인가요?",
    children: [
      { id: "violence_threat", label: "폭력 위협 또는 조장", reasonId: "VIOLENCE" },
      { id: "violence_hate", label: "혐오 표현", reasonId: "HATE" },
      { id: "violence_abuse", label: "학대·잔혹 행위", reasonId: "ABUSE" },
    ],
  },
  {
    id: "bullying",
    label: "따돌림 또는 원치 않는 연락",
    childQuestion: "어떤 유형인가요?",
    children: [
      { id: "bullying_harass", label: "괴롭힘·따돌림", reasonId: "HARASSMENT" },
      { id: "bullying_unwanted", label: "원치 않는 연락·스토킹", reasonId: "HARASSMENT" },
      { id: "bullying_privacy", label: "개인정보 무단 공개", reasonId: "PRIVACY" },
    ],
  },
  { id: "ip", label: "지식재산권 침해", reasonId: "COPYRIGHT" },
  { id: "self_harm", label: "자살 또는 자해", reasonId: "SELF_HARM" },
  { id: "false_info", label: "거짓 정보", reasonId: "FALSE_INFO" },
  { id: "underage", label: "18세 미만 이용자와 관련된 문제", reasonId: "UNDERAGE" },
];

export function formatReportPathLabel(path: ReportPathStep[]): string {
  return path.map((s) => s.node.label).join(" › ");
}
