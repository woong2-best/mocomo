import { MOCO_TRANSFER_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOCO Transfers (Section 22) — MoCoMo",
  description:
    "MoCoMo ATM Transfer terms: voluntary support, non-refundable transfers, prohibited content, age eligibility, and enforcement.",
};

export default function MocoTransferTermsPage() {
  return <LegalDocumentView document={MOCO_TRANSFER_TERMS} />;
}
