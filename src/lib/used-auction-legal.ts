import { LEGAL_CONTACT_EMAIL } from "@/lib/legal-content";

/** 입찰·즉시구매 전 필수 동의 문구 */
export const USED_AUCTION_BID_CONSENT_LABEL =
  "낙찰 후 지정된 결제 기한 내 대금을 지급하지 않을 경우 중고거래·경매 이용이 제한될 수 있음에 동의합니다.";

/** 경매 상세·목록 하단 C2C 고지 */
export const USED_AUCTION_C2C_DISCLOSURE =
  "MoCoMo는 이용자 간(C2C) 중고·경매 거래를 연결하는 통신판매중개 플랫폼입니다. 경매 대금은 회사가 보관·중개하지 않으며, 판매자와 구매자가 직접 협의·결제합니다. 거래 당사자는 전자상거래법상 통신판매업자에 해당할 수 있으며, 각자의 법적 의무를 준수해야 합니다.";

/** 제재 후 이의 신청 기한(일) */
export const USED_MARKET_APPEAL_WINDOW_DAYS = 7;

export const USED_MARKET_APPEAL_PATH = "/used/appeal";

export function usedMarketAppealMailto(subject: string): string {
  return `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** 제재 로그 보존 기간(일) — 민원·분쟁 입증용 */
export const USED_MARKET_SANCTION_RETENTION_DAYS = 365;

export function usedMarketSanctionRetainUntil(from = Date.now()): Date {
  return new Date(from + USED_MARKET_SANCTION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
