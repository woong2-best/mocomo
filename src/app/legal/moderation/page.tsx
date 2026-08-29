import { MODERATION_POLICY } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "콘텐츠 신고 및 운영 정책 — MoCoMo",
  description: "MoCoMo content reporting process and repeat violators enforcement policy.",
};

export default function ModerationPolicyPage() {
  return <LegalDocumentView document={MODERATION_POLICY} />;
}
