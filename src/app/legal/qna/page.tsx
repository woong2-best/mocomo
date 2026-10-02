import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { CREATOR_SETTLEMENT_QNA } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.moco_qna_mocomo"),
  description: t("app.legal.moco"),
};

export default function CreatorSettlementQnaPage() {
  return <LegalDocumentView document={CREATOR_SETTLEMENT_QNA} />;
}
