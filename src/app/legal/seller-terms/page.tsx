import { SELLER_TERMS } from "@/lib/marketplace/seller-legal";
import { LegalDocumentView } from "@/components/legal/legal-document";
import type { Metadata } from "next";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";

export const metadata: Metadata = {
  title: `판매자 이용약관 — ${MARKET_BRAND_FULL}`,
};

export default function SellerTermsPage() {
  return <LegalDocumentView document={SELLER_TERMS} />;
}
