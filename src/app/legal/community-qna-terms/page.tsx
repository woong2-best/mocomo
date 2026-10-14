import { COMMUNITY_QNA_TERMS } from "@/lib/legal-content";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Q&A Feature Terms — MoCoMo",
  description:
    "MoCoMo community Q&A terms: disclaimers, no professional advice, Section 230, indemnification, and arbitration.",
};

export default async function CommunityQnaTermsPage() {
  return <PublishedLegalDocument fallback={COMMUNITY_QNA_TERMS} />;
}
