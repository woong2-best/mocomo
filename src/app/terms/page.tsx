import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { LegalDocumentView } from "@/components/legal/legal-document";
import { buildUnifiedTermsDocument } from "@/lib/legal-unified-terms";
import { resolveLegalCountryCode } from "@/lib/legal-country";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.terms.mocomo"),
};

export default async function TermsPage() {
  const countryCode = await resolveLegalCountryCode();
  const document = buildUnifiedTermsDocument(countryCode);
  return <LegalDocumentView document={document} />;
}
