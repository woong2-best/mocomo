import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { ACCOUNT_DELETION } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo"),
  description:
    t("app.legal.mocomo_2"),
};

export default function AccountDeletionPage() {
  return <LegalDocumentView document={ACCOUNT_DELETION} />;
}
