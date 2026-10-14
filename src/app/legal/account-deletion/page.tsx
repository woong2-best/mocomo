import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { ACCOUNT_DELETION } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo"),
  description:
    t("app.legal.mocomo_2"),
};

export default async function AccountDeletionPage() {
  return <PublishedLegalDocument fallback={ACCOUNT_DELETION} />;
}
