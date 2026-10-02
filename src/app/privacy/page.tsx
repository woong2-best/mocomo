import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { PRIVACY_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.privacy.mocomo"),
};

export default function PrivacyPage() {
  return <LegalDocumentView document={PRIVACY_POLICY} />;
}
