import { translate } from "@/i18n/runtime";
import { LEGAL_POLICY_LINKS, type LegalLink } from "@/lib/legal-links";

export type LocalizedLegalLink = LegalLink & { label: string };

export function localizedLegalPolicyLinks(_locale?: string): LocalizedLegalLink[] {
  return LEGAL_POLICY_LINKS.map((item) => ({
    ...item,
    label: translate(item.labelKey),
  }));
}
