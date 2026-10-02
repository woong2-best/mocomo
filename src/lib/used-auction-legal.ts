import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-content";

/** Required consent before bid / buy-now (English catalog key) */
export const USED_AUCTION_BID_CONSENT_LABEL_KEY = "used.auctionBidConsentLabel" as const;

/** C2C disclosure on auction detail / list footer */
export const USED_AUCTION_C2C_DISCLOSURE =
  "MoCoMo connects peer-to-peer (C2C) used and auction trades. Auction payments are not held or brokered by MoCoMo; buyers and sellers arrange payment directly. Parties may have seller obligations under local e-commerce law.";

/** 제재 후 이의 신청 기한(일) */
export const USED_MARKET_APPEAL_WINDOW_DAYS = 7;

export const USED_MARKET_APPEAL_PATH = "/market/appeal";

export function usedMarketAppealMailto(subject: string): string {
  return `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** 제재 로그 보존 기간(일) — 민원·분쟁 입증용 */
export const USED_MARKET_SANCTION_RETENTION_DAYS = 365;

export function usedMarketSanctionRetainUntil(from = Date.now()): Date {
  return new Date(from + USED_MARKET_SANCTION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
