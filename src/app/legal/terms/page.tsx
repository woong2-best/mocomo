import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { TERMS_OF_SERVICE } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import { resolveLegalCountryCode } from "@/lib/legal-country";
import { getTermsSupplementalBlocks } from "@/lib/legal-supplemental-clauses";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.terms.mocomo"),
};

export default async function TermsPage() {
  const countryCode = await resolveLegalCountryCode();
  const supplementalBlocks = getTermsSupplementalBlocks(countryCode);

  return (
    <PublishedLegalDocument fallback={TERMS_OF_SERVICE} supplementalBlocks={supplementalBlocks} />
  );
}
