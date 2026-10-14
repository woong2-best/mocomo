import { MOCO_TRANSFER_TERMS } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "MOCO Transfers (Section X) — MoCoMo",
  description:
    "MoCoMo ATM Transfer terms: voluntary support, non-refundable transfers, prohibited content, age eligibility, and enforcement.",
};

export default async function MocoTransferTermsPage() {
  return <PublishedLegalDocument fallback={MOCO_TRANSFER_TERMS} />;
}
