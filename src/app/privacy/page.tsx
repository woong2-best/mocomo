import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { PRIVACY_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.privacy.mocomo"),
};

export default async function PrivacyPage() {
  return <PublishedLegalDocument fallback={PRIVACY_POLICY} />;
}
