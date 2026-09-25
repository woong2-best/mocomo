import { COMMUNITY_QNA_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Q&A Feature Terms — MoCoMo",
  description:
    "MoCoMo community Q&A terms: disclaimers, no professional advice, Section 230, indemnification, and arbitration.",
};

export default function CommunityQnaTermsPage() {
  return <LegalDocumentView document={COMMUNITY_QNA_TERMS} />;
}
