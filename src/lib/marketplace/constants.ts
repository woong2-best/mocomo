import type { MarketplaceListingType } from "@prisma/client";

/** 플랫폼 수수료 — 10% (1000 bps) */
export const MARKETPLACE_PLATFORM_FEE_BPS = 1000;

export const MARKETPLACE_LISTING_TYPES: {
  id: MarketplaceListingType;
  label: string;
  description: string;
}[] = [
  { id: "PHYSICAL", label: "일반상품", description: "재고 기반 실물 상품" },
  { id: "CUSTOM_ORDER", label: "주문제작", description: "코스프레 의상·소품 등 제작" },
  { id: "DIGITAL", label: "디지털", description: "PSD·브러시·3D·음원 등" },
  { id: "PREORDER", label: "예약판매", description: "예약 후 제작·발송" },
];

export const MARKETPLACE_CATEGORIES = [
  "코스프레",
  "굿즈",
  "피규어",
  "동인지·아트북",
  "팬아트",
  "디지털 에셋",
  "일러스트",
  "의상·소품",
  "기타",
] as const;

export const MARKETPLACE_SHIPPING_METHODS = [
  { id: "EMS", label: "EMS" },
  { id: "FEDEX", label: "FedEx" },
  { id: "UPS", label: "UPS" },
  { id: "DHL", label: "DHL" },
  { id: "POST", label: "우체국" },
  { id: "DIRECT", label: "직접배송" },
  { id: "FREE", label: "무료배송" },
  { id: "DIGITAL_NONE", label: "배송 없음(디지털)" },
] as const;

export const AUTO_CONFIRM_DAYS_AFTER_DELIVERY = 7;

export function computeMarketplaceFees(subtotalAmount: number, shippingAmount = 0) {
  const platformFeeAmount = Math.floor((subtotalAmount * MARKETPLACE_PLATFORM_FEE_BPS) / 10_000);
  const sellerEarnAmount = Math.max(0, subtotalAmount - platformFeeAmount);
  const totalAmount = subtotalAmount + shippingAmount;
  return { platformFeeAmount, sellerEarnAmount, totalAmount };
}

export function listingTypeLabel(type: MarketplaceListingType): string {
  return MARKETPLACE_LISTING_TYPES.find((t) => t.id === type)?.label ?? type;
}
