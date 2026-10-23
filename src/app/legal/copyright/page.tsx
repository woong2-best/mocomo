import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { COPYRIGHT_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_3"),
};

export default async function CopyrightPolicyPage() {
  return <PublishedLegalDocument fallback={COPYRIGHT_POLICY} />;
}
