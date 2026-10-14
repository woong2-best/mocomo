import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { COMMUNITY_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_11"),
};

export default async function CommunityPolicyPage() {
  return <PublishedLegalDocument fallback={COMMUNITY_POLICY} />;
}
