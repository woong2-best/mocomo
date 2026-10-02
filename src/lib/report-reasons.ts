import type { Locale } from "@/lib/i18n/config";
import {
  POST_REPORT_DISCLAIMER_EN,
  POST_REPORT_OTHER_DETAILS_PROMPT_EN,
  POST_REPORT_REVIEW_HINT_EN,
  POST_REPORT_ROOT_QUESTION_EN,
  CHAT_REPORT_ROOT_QUESTION_EN,
  POST_REPORT_TAXONOMY_EN,
  REPORT_REASONS_EN,
} from "@/lib/report-reasons-en";

/** Client + server 공용 — `"use server"` 파일에서 객체를 export하면 Next.js가 거부함 */

/** Flat reason ids used for risk scoring + API validation */
export const REPORT_REASONS = [
  { id: "SPAM", label: "Spam · ads" },
  { id: "ABUSE", label: "Abuse · harassment" },
  { id: "HARASSMENT", label: "Harassment" },
  { id: "HATE", label: "Hate speech" },
  { id: "VIOLENCE", label: "Violence" },
  { id: "FRAUD", label: "Fraud · illegal trade" },
  { id: "PRIVACY", label: "Privacy" },
  { id: "COPYRIGHT", label: "Copyright" },
  { id: "SEXUAL", label: "Adult content" },
  { id: "IMPERSONATION", label: "Impersonation" },
  { id: "SELF_HARM", label: "Self-harm" },
  { id: "FALSE_INFO", label: "False information" },
  { id: "UNDERAGE", label: "Minors" },
  { id: "POLITICAL", label: "Political manipulation" },
  { id: "REGULATED", label: "Regulated goods" },
  { id: "OTHER", label: "Other" },
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
  /** Leaf — ask free-text before review (e.g. 기타) */
  requiresDetails?: boolean;
};

export const POST_REPORT_ROOT_QUESTION = POST_REPORT_ROOT_QUESTION_EN;

export const CHAT_REPORT_ROOT_QUESTION = CHAT_REPORT_ROOT_QUESTION_EN;

export const POST_REPORT_DISCLAIMER = POST_REPORT_DISCLAIMER_EN;

export const POST_REPORT_REVIEW_HINT = POST_REPORT_REVIEW_HINT_EN;

export const POST_REPORT_OTHER_DETAILS_PROMPT = POST_REPORT_OTHER_DETAILS_PROMPT_EN;

export const POST_REPORT_OTHER_DETAILS_MIN = 5;

export const POST_REPORT_TAXONOMY: ReportTaxonomyNode[] = POST_REPORT_TAXONOMY_EN;

/* legacy Korean taxonomy removed — English-only web uses POST_REPORT_TAXONOMY_EN */

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

export type PostReportCopy = {
  reasons: ReadonlyArray<{ id: ReportReasonId; label: string }>;
  taxonomy: ReportTaxonomyNode[];
  rootQuestion: string;
  disclaimer: string;
  reviewHint: string;
  otherDetailsPrompt: string;
};

export function getPostReportCopy(
  locale: Locale | string | undefined,
  kind: "post" | "chat" = "post"
): PostReportCopy {
  
  return {
    reasons: REPORT_REASONS_EN,
    taxonomy: POST_REPORT_TAXONOMY_EN,
    rootQuestion:
      kind === "chat" ? CHAT_REPORT_ROOT_QUESTION_EN : POST_REPORT_ROOT_QUESTION_EN,
    disclaimer: POST_REPORT_DISCLAIMER_EN,
    reviewHint: POST_REPORT_REVIEW_HINT_EN,
    otherDetailsPrompt: POST_REPORT_OTHER_DETAILS_PROMPT_EN,
  };
}
