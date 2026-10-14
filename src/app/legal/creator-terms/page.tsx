import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { CREATOR_TERMS } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_4"),
};

export default async function CreatorTermsPage() {
  return <PublishedLegalDocument fallback={CREATOR_TERMS} />;
}
