import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { SPONSORED_CONTENT_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_13"),
};

export default function SponsoredContentPolicyPage() {
  return <LegalDocumentView document={SPONSORED_CONTENT_POLICY} />;
}
