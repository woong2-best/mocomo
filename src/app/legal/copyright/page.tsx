import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { COPYRIGHT_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_3"),
};

export default function CopyrightPolicyPage() {
  return <LegalDocumentView document={COPYRIGHT_POLICY} />;
}
