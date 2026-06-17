import { COPYRIGHT_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "저작권 정책 — MoCoMo",
};

export default function CopyrightPolicyPage() {
  return <LegalDocumentView document={COPYRIGHT_POLICY} />;
}
