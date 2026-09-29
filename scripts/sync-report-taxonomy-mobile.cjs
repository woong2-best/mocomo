const fs = require("fs");
const path = require("path");

const webPath = path.join(__dirname, "../src/lib/report-reasons.ts");
const mobilePath = path.join(__dirname, "../apps/mobile/src/lib/report-taxonomy.ts");
const s = fs.readFileSync(webPath, "utf8");
const start = s.indexOf("export const POST_REPORT_ROOT_QUESTION");
const end = s.indexOf("export type ReportPathStep");
const block = s.slice(start, end);

const header = `/**
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

`;

const footer = `
export function formatReportPathLabel(path: ReportPathStep[]): string {
  return path.map((s) => s.node.label).join(" › ");
}
`;

fs.writeFileSync(mobilePath, header + block + footer);
console.log("[sync-report-taxonomy] wrote", mobilePath);
