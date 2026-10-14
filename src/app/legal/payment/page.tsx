import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { PAYMENT_REFUND_POLICY } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: t("app.legal.mocomo_10"),
};

export default async function PaymentPolicyPage() {
  return <PublishedLegalDocument fallback={PAYMENT_REFUND_POLICY} />;
}
