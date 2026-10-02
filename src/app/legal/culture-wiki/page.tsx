import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { CULTURE_WIKI_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_5"),
  description: t("app.legal.mocomo_cc_by_nc_sa"),
};

export default function CultureWikiTermsPage() {
  return <LegalDocumentView document={CULTURE_WIKI_TERMS} />;
}
