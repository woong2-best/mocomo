import { ACCOUNT_DELETION } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "계정 및 데이터 삭제 — MoCoMo",
  description:
    "MoCoMo 계정 삭제 요청 방법, 삭제·보관되는 데이터 유형 및 처리 기간 안내",
};

export default function AccountDeletionPage() {
  return <LegalDocumentView document={ACCOUNT_DELETION} />;
}
