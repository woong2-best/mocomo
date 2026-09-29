/**
 * MoCoMo post report taxonomy (mirrored from src/lib/report-reasons.ts).
 * Keep in sync when web taxonomy changes.
 * Run: node scripts/sync-report-taxonomy-mobile.cjs
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
  requiresDetails?: boolean;
};

export type ReportPathStep = {
  question: string;
  node: ReportTaxonomyNode;
};

import {
  POST_REPORT_DISCLAIMER_EN,
  POST_REPORT_OTHER_DETAILS_PROMPT_EN,
  POST_REPORT_REVIEW_HINT_EN,
  POST_REPORT_ROOT_QUESTION_EN,
  POST_REPORT_TAXONOMY_EN,
} from "@/lib/report-taxonomy-en";

export const POST_REPORT_ROOT_QUESTION =
  "이 게시물을 신고하는 이유는 무엇인가요?";

export const POST_REPORT_DISCLAIMER =
  "신고된 내용은 모코모 관리팀 검토 후 신속하게 조치됩니다. 신고자의 개인정보는 안전하게 보호됩니다.";

export const POST_REPORT_REVIEW_HINT =
  "모코모 커뮤니티 가이드라인에 맞춰 검토가 진행됩니다.";

export const POST_REPORT_OTHER_DETAILS_PROMPT =
  "어떤 문제인지 구체적으로 알려주세요.";

export const POST_REPORT_OTHER_DETAILS_MIN = 5;

/**
 * Six MoCoMo top categories → prior Instagram-style depth preserved under each.
 */
export const POST_REPORT_TAXONOMY: ReportTaxonomyNode[] = [
  {
    id: "spam_fraud",
    label: "스팸 / 불법 홍보 / 사기",
    childQuestion: "다음 중 문제를 가장 잘 설명하는 항목은 무엇인가요?",
    children: [
      {
        id: "scam_false",
        label: "거짓 또는 사기",
        childQuestion: "어떤 종류의 거짓 또는 사기인가요?",
        children: [
          { id: "scam_finance", label: "금융 또는 신원 사기", reasonId: "FRAUD" },
          {
            id: "scam_celeb_endorse",
            label: "유명인 사칭·허위 보증",
            reasonId: "IMPERSONATION",
          },
          {
            id: "scam_misleading",
            label: "오해의 소지가 있는 제품 또는 서비스",
            reasonId: "FRAUD",
          },
          { id: "scam_gambling", label: "도박 사기", reasonId: "FRAUD" },
        ],
      },
      {
        id: "scam_impersonation",
        label: "사칭",
        childQuestion: "어떤 유형의 사칭인가요?",
        children: [
          {
            id: "scam_fake_account",
            label: "가짜 계정·브랜드 사칭",
            reasonId: "IMPERSONATION",
          },
          {
            id: "scam_celeb_fake",
            label: "유명인 사칭·허위 보증",
            reasonId: "IMPERSONATION",
          },
        ],
      },
      { id: "scam_spam", label: "스팸·반복 홍보", reasonId: "SPAM" },
      {
        id: "regulated",
        label: "규제 품목의 판매 또는 홍보",
        childQuestion: "무엇이 판매 또는 홍보되고 있나요?",
        children: [
          {
            id: "regulated_drugs",
            label: "약물·마약",
            childQuestion: "어떤 종류의 약물인가요?",
            children: [
              {
                id: "regulated_drugs_hard",
                label: "코카인·헤로인·펜타닐 등 고위험 약물",
                reasonId: "REGULATED",
              },
              { id: "regulated_drugs_rx", label: "처방약", reasonId: "REGULATED" },
              {
                id: "regulated_drugs_other",
                label: "기타 불법·위험 약물",
                reasonId: "REGULATED",
              },
            ],
          },
          { id: "regulated_weapons", label: "총기·무기", reasonId: "REGULATED" },
          { id: "regulated_animals", label: "동물", reasonId: "REGULATED" },
        ],
      },
    ],
  },
  {
    id: "abuse_hate",
    label: "욕설 / 비방 / 혐오 / 폭력 표현",
    childQuestion: "어떤 유형의 문제인가요?",
    children: [
      {
        id: "profanity_defamation",
        label: "욕설 또는 비방",
        childQuestion: "누구를 향한 내용인가요?",
        children: [
          { id: "defame_user", label: "특정 이용자·계정", reasonId: "ABUSE" },
          { id: "defame_group", label: "특정 집단·소수자", reasonId: "HATE" },
          {
            id: "defame_author",
            label: "게시물·댓글 작성자에게 직접 향함",
            reasonId: "HARASSMENT",
          },
          { id: "defame_unspecified", label: "불특정 또는 기타", reasonId: "ABUSE" },
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
          {
            id: "bullying_unwanted",
            label: "원치 않는 연락·스토킹",
            reasonId: "HARASSMENT",
          },
        ],
      },
      { id: "self_harm", label: "자살 또는 자해", reasonId: "SELF_HARM" },
    ],
  },
  {
    id: "sexual",
    label: "성인용 / 음란성 콘텐츠",
    childQuestion: "어떤 유형의 성인용·음란 문제인가요?",
    children: [
      {
        id: "adult_nsfw_unmarked",
        label: "성인용 게시물인데 NSFW(성인) 표시를 하지 않음",
        reasonId: "SEXUAL",
      },
      {
        id: "adult_minor_target",
        label: "미성년자를 대상으로 한 성적 콘텐츠",
        reasonId: "UNDERAGE",
      },
      {
        id: "adult_threat_share",
        label: "공유하겠다는 위협",
        reasonId: "SEXUAL",
      },
      { id: "adult_sex_work", label: "성매매인 것 같음", reasonId: "SEXUAL" },
      { id: "adult_abuse", label: "성적 학대인 것 같음", reasonId: "SEXUAL" },
      {
        id: "underage_safety",
        label: "18세 미만 이용자와 관련된 문제(성적 외)",
        reasonId: "UNDERAGE",
      },
    ],
  },
  {
    id: "privacy_ip",
    label: "개인정보 노출 및 지적재산권 침해",
    childQuestion: "어떤 유형인가요?",
    children: [
      { id: "bullying_privacy", label: "개인정보 무단 공개", reasonId: "PRIVACY" },
      { id: "ip", label: "저작권·지적재산권 침해", reasonId: "COPYRIGHT" },
    ],
  },
  {
    id: "false_info",
    label: "허위 사실 및 거짓 정보",
    childQuestion: "어떤 유형의 허위·조작 정보인가요?",
    children: [
      { id: "false_info_general", label: "건강·안전 등 허위 정보", reasonId: "FALSE_INFO" },
      { id: "false_info_other", label: "기타 거짓·오해 유발 정보", reasonId: "FALSE_INFO" },
    ],
  },
  {
    id: "other",
    label: "기타 문제",
    reasonId: "OTHER",
    requiresDetails: true,
  },
];


export function formatReportPathLabel(path: ReportPathStep[]): string {
  return path.map((s) => s.node.label).join(" › ");
}

export type PostReportCopy = {
  taxonomy: ReportTaxonomyNode[];
  rootQuestion: string;
  disclaimer: string;
  reviewHint: string;
  otherDetailsPrompt: string;
};

export function getPostReportCopy(locale: string | undefined): PostReportCopy {
  if (locale === "ko") {
    return {
      taxonomy: POST_REPORT_TAXONOMY,
      rootQuestion: POST_REPORT_ROOT_QUESTION,
      disclaimer: POST_REPORT_DISCLAIMER,
      reviewHint: POST_REPORT_REVIEW_HINT,
      otherDetailsPrompt: POST_REPORT_OTHER_DETAILS_PROMPT,
    };
  }
  return {
    taxonomy: POST_REPORT_TAXONOMY_EN,
    rootQuestion: POST_REPORT_ROOT_QUESTION_EN,
    disclaimer: POST_REPORT_DISCLAIMER_EN,
    reviewHint: POST_REPORT_REVIEW_HINT_EN,
    otherDetailsPrompt: POST_REPORT_OTHER_DETAILS_PROMPT_EN,
  };
}
