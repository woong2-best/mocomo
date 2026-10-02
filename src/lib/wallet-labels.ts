export const LEDGER_LABELS: Record<string, string> = {
  SELLER_EARNING: "Earnings credit",
  PAYOUT_REQUEST: "Payout",
  PAYOUT_REJECTED: "Payout rejection refund",
};

export const EARNING_SOURCE_LABELS: Record<string, string> = {
  tip: "Tip",
  marketplace_escrow: "More Commerce Moment",
  creator_subscription: "Subscription",
  post_media: "Paid media",
  digital_product: "Digital product",
  call_booking: "Currency reservation",
  emoticon_gift: "Emoticons",
  flower_redeem: "Flower",
  physical_order: "Goods",
  creator_episode: "Episode",
  moco_tip: "Tip",
};

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
