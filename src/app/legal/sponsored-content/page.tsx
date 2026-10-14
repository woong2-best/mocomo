import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { SPONSORED_CONTENT_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_13"),
};

export default async function SponsoredContentPolicyPage() {
  return <PublishedLegalDocument fallback={SPONSORED_CONTENT_POLICY} />;
}
