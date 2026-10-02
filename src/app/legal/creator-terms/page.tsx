import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { CREATOR_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_4"),
};

export default function CreatorTermsPage() {
  return <LegalDocumentView document={CREATOR_TERMS} />;
}
