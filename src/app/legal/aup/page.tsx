import { ACCEPTABLE_USE_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceptable Use Policy (AUP) — MoCoMo",
  description:
    "MoCoMo Acceptable Use Policy — prohibited content including adult services, IP infringement, and hate speech.",
};

export default function AcceptableUsePolicyPage() {
  return <LegalDocumentView document={ACCEPTABLE_USE_POLICY} />;
}
