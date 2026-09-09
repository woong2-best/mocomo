import { TERMS_OF_SERVICE } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import { resolveLegalCountryCode } from "@/lib/legal-country";
import { getTermsSupplementalBlocks } from "@/lib/legal-supplemental-clauses";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — MoCoMo",
};

export default async function TermsPage() {
  const countryCode = await resolveLegalCountryCode();
  const supplementalBlocks = getTermsSupplementalBlocks(countryCode);

  return (
    <LegalDocumentView document={TERMS_OF_SERVICE} supplementalBlocks={supplementalBlocks} />
  );
}
