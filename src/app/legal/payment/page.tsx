import { PAYMENT_REFUND_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "결제 및 환불 정책 — MoCoMo",
};

export default function PaymentPolicyPage() {
  return <LegalDocumentView document={PAYMENT_REFUND_POLICY} />;
}
