import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { MODERATION_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_6"),
  description: "MoCoMo content reporting process and repeat violators enforcement policy.",
};

export default async function ModerationPolicyPage() {
  return <PublishedLegalDocument fallback={MODERATION_POLICY} />;
}
