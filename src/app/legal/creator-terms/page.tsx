import { CREATOR_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "크리에이터 약관 — MoCoMo",
};

export default function CreatorTermsPage() {
  return <LegalDocumentView document={CREATOR_TERMS} />;
}
