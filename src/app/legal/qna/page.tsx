import { CREATOR_SETTLEMENT_QNA } from "@/lib/legal-content";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOCO 정산 QnA — MoCoMo",
  description: "MOCO 충전·정산·세무 및 제재 국가에 관한 자주 묻는 질문",
};

export default function CreatorSettlementQnaPage() {
  return <LegalDocumentView document={CREATOR_SETTLEMENT_QNA} />;
}
