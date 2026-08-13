import { SPONSORED_CONTENT_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "광고·이벤트 게시 약관 — MoCoMo",
};

export default function SponsoredContentPolicyPage() {
  return <LegalDocumentView document={SPONSORED_CONTENT_POLICY} />;
}
