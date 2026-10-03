/**
 * MoCoMo post report taxonomy (mirrored from src/lib/report-reasons.ts).
 * English source tree; UI strings are translated on-device via ML Kit.
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
  CHAT_REPORT_ROOT_QUESTION_EN,
  POST_REPORT_DISCLAIMER_EN,
  POST_REPORT_OTHER_DETAILS_PROMPT_EN,
  POST_REPORT_OTHER_DETAILS_MIN,
  POST_REPORT_REVIEW_HINT_EN,
  POST_REPORT_ROOT_QUESTION_EN,
  POST_REPORT_TAXONOMY_EN,
} from "@/lib/report-taxonomy-en";

export { POST_REPORT_OTHER_DETAILS_MIN };

export type PostReportCopy = {
  taxonomy: ReportTaxonomyNode[];
  rootQuestion: string;
  disclaimer: string;
  reviewHint: string;
  otherDetailsPrompt: string;
};

export function formatReportPathLabel(path: ReportPathStep[]): string {
  return path.map((step) => step.node.label).filter(Boolean).join(" › ");
}

export function getPostReportCopy(
  _locale?: string,
  kind: "post" | "chat" = "post"
): PostReportCopy {
  return {
    taxonomy: POST_REPORT_TAXONOMY_EN,
    rootQuestion:
      kind === "chat" ? CHAT_REPORT_ROOT_QUESTION_EN : POST_REPORT_ROOT_QUESTION_EN,
    disclaimer: POST_REPORT_DISCLAIMER_EN,
    reviewHint: POST_REPORT_REVIEW_HINT_EN,
    otherDetailsPrompt: POST_REPORT_OTHER_DETAILS_PROMPT_EN,
  };
}
