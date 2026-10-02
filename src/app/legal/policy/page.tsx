import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { COMMUNITY_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_11"),
};

export default function CommunityPolicyPage() {
  return <LegalDocumentView document={COMMUNITY_POLICY} />;
}
