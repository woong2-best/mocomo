import type { MarketplaceListingType } from "@prisma/client";
import { isVisaBrand } from "@/lib/marketplace/card-authorization";

/** 판매자 입점비 — Stripe 미지원 국가(KR 등) 1회 $40 */
export const VENDOR_ONBOARDING_FEE_USD_CENTS = 4_000;

/** 플랫폼 수수료 — 10% (1000 bps) — Stripe 지원 국가 거래만 */
export const MARKETPLACE_PLATFORM_FEE_BPS = 1000;

export const MARKETPLACE_LISTING_TYPES: {
  id: MarketplaceListingType;
  label: string;
  description: string;
}[] = [
  { id: "PHYSICAL", label: "Standard product", description: "In-stock physical goods" },
  { id: "CUSTOM_ORDER", label: "Made to order", description: "Cosplay costumes, props, and custom work" },
  { id: "PREORDER", label: "Pre-order", description: "Produce and ship after pre-order" },
];

/** Browse / sell UI — 디지털 상품 신규 등록·노출 제외 (레거시 DB 타입은 유지) */
export const MARKETPLACE_BROWSE_LISTING_TYPES = MARKETPLACE_LISTING_TYPES;

export const MARKETPLACE_CATEGORIES = [
  "Cosplay",
  "Goods",
  "Figures",
  "TCG · trading cards",
  "Photocards",
  "Doujin · art books",
  "Events · limited",
  "VTuber · streamer",
  "Board games",
  "Fan art",
  "Illustration",
  "Costumes · props",
  "Other",
] as const;

/** @deprecated Prefer shipping-config carriers (KR_POST, US_USPS, INTL_EMS, etc). Kept for legacy reads. */
export const MARKETPLACE_SHIPPING_METHODS = [
  { id: "EMS", label: "EMS" },
  { id: "FEDEX", label: "FedEx" },
  { id: "UPS", label: "UPS" },
  { id: "DHL", label: "DHL" },
  { id: "POST", label: "Postal service" },
  { id: "DIRECT", label: "Direct shipping" },
  { id: "FREE", label: "Free shipping" },
  { id: "DIGITAL_NONE", label: "No shipping (digital)" },
] as const;

export {
  MARKETPLACE_SHIP_COUNTRIES,
  MARKETPLACE_DOMESTIC_CARRIERS,
  MARKETPLACE_INTERNATIONAL_CARRIERS,
} from "./shipping-config";

/** Visa Extended Authorization network surcharge — 0.08% (8 bps), Visa + EA only */
export const VISA_EXTENDED_AUTH_FEE_BPS = 8;

export const AUTO_CONFIRM_DAYS_AFTER_DELIVERY = 7;

export type MarketplaceFeeOptions = {
  cardBrand?: string | null;
  /** Visa EA active (flag ON + extended hold, or flag ON at quote time) */
  visaExtendedAuthApplied?: boolean;
};

export function computeMarketplaceFees(
  subtotalAmount: number,
  shippingAmount = 0,
  feeOpts?: MarketplaceFeeOptions
) {
  const platformFeeAmount = Math.floor((subtotalAmount * MARKETPLACE_PLATFORM_FEE_BPS) / 10_000);
  const sellerEarnAmount = Math.max(0, subtotalAmount - platformFeeAmount);
  const totalAmount = subtotalAmount + shippingAmount;

  const variableFeeAmount =
    feeOpts?.visaExtendedAuthApplied && isVisaBrand(feeOpts.cardBrand)
      ? Math.floor((totalAmount * VISA_EXTENDED_AUTH_FEE_BPS) / 10_000)
      : 0;

  return { platformFeeAmount, sellerEarnAmount, totalAmount, variableFeeAmount };
}

export function listingTypeLabel(type: MarketplaceListingType): string {
  const labels: Record<MarketplaceListingType, string> = {
    PHYSICAL: "Standard product",
    CUSTOM_ORDER: "Made to order",
    PREORDER: "Pre-order",
    DIGITAL: "Digital",
  };
  return labels[type] ?? type;
}
