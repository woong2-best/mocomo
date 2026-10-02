import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { PAYMENT_REFUND_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_10"),
};

export default function PaymentPolicyPage() {
  return <LegalDocumentView document={PAYMENT_REFUND_POLICY} />;
}
