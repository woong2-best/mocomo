import { MOCO_PURCHASE_TERMS } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOCO Purchase Terms — MoCoMo",
  description:
    "Terms that apply to every purchase of MOCO on MoCoMo, including the MOCO and Fortune Cookie package.",
};

export default async function MocoPurchaseTermsPage() {
  return <PublishedLegalDocument fallback={MOCO_PURCHASE_TERMS} />;
}
