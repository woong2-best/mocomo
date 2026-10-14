import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { CREATOR_SETTLEMENT_QNA } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.moco_qna_mocomo"),
  description: t("app.legal.moco"),
};

export default async function CreatorSettlementQnaPage() {
  return <PublishedLegalDocument fallback={CREATOR_SETTLEMENT_QNA} />;
}
