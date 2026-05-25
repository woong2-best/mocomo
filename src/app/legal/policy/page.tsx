import { COMMUNITY_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "운영원칙 및 이용정책 — MoCoMo",
};

export default function CommunityPolicyPage() {
  return <LegalDocumentView document={COMMUNITY_POLICY} />;
}
