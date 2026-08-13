export const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: "수익 적립",
  PAYOUT_REQUEST: "출금",
  PAYOUT_REJECTED: "출금 반려 환급",
};

export const EARNING_SOURCE_LABELS: Record<string, string> = {
  tip: "후원",
  marketplace_escrow: "More Commerce Moment",
  creator_subscription: "구독",
  post_media: "유료 미디어",
  digital_product: "디지털 상품",
  call_booking: "통화 예약",
  emoticon_gift: "이모티콘",
  flower_redeem: "Flower",
  physical_order: "굿즈",
  creator_episode: "회차",
  moco_tip: "후원",
};

export const MONTH_LABELS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
] as const;
