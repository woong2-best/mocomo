import { SELLER_TERMS } from "@/lib/marketplace/seller-legal";
import { PublishedLegalDocument } from "@/components/legal/published-legal-document";
import type { Metadata } from "next";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";

export const metadata: Metadata = {
  title: `Seller terms of service — ${MARKET_BRAND_FULL}`,
};

export default async function SellerTermsPage() {
  return <PublishedLegalDocument fallback={SELLER_TERMS} />;
}
