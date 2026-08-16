import { CULTURE_WIKI_TERMS } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "컬쳐 위키 이용 약관 — MoCoMo",
  description: "MoCoMo 컬쳐 위키 이용 조건, CC BY-NC-SA 4.0, DMCA 및 저작권 정책",
};

export default function CultureWikiTermsPage() {
  return <LegalDocumentView document={CULTURE_WIKI_TERMS} />;
}
