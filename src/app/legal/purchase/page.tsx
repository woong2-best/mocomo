import { MOCO_PURCHASE_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOCO Purchase Terms — MoCoMo",
  description:
    "Terms that apply to every purchase of MOCO on MoCoMo, including the MOCO and Contribution Tower package.",
};

export default function MocoPurchaseTermsPage() {
  return <LegalDocumentView document={MOCO_PURCHASE_TERMS} />;
}
