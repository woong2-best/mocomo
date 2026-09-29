import { uiText } from "@/i18n/ui-text";
import { LEGAL_POLICY_LINKS, type LegalLink } from "@/lib/legal-links";

const EN: Record<string, string> = {
  "/legal/terms": "Terms of Service",
  "/legal/community-qna-terms": "Q&A Terms (Section 13)",
  "/legal/aup": "Acceptable Use Policy (AUP)",
  "/legal/creator-terms": "Creator Terms",
  "/legal/qna": "MOCO settlement Q&A",
  "/legal/payment": "Payment & refund policy",
  "/legal/copyright": "Copyright policy",
  "/legal/privacy": "Privacy policy",
  "/legal/policy": "Community guidelines",
};

export function localizedLegalPolicyLinks(locale?: string): LegalLink[] {
  return LEGAL_POLICY_LINKS.map((item) => ({
    ...item,
    label: uiText(locale, item.label, EN[item.path] ?? item.label),
  }));
}
