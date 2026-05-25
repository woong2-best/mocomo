import { TERMS_OF_SERVICE } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — MoCoMo",
};

export default function TermsPage() {
  return <LegalDocumentView document={TERMS_OF_SERVICE} />;
}
