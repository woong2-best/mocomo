/** 라이브 댓글 후원 (YouTube Super Chat 스타일) */

export const COMMENT_DONATION_MESSAGE_MAX = 200;

export const COMMENT_DONATION_PRESETS = [200, 500, 1000, 5000] as const;

export type CommentDonationTier = {
  id: string;
  minCents: number;
  headerBg: string;
  bodyBg: string;
  textColor: string;
};

/** 금액 구간별 Super Chat 색상 */
export const COMMENT_DONATION_TIERS: CommentDonationTier[] = [
  {
    id: "blue",
    minCents: 100,
    headerBg: "#1565C0",
    bodyBg: "#E3F2FD",
    textColor: "#0D47A1",
  },
  {
    id: "cyan",
    minCents: 200,
    headerBg: "#00838F",
    bodyBg: "#E0F7FA",
    textColor: "#006064",
  },
  {
    id: "green",
    minCents: 500,
    headerBg: "#2E7D32",
    bodyBg: "#E8F5E9",
    textColor: "#1B5E20",
  },
  {
    id: "yellow",
    minCents: 1000,
    headerBg: "#F9A825",
    bodyBg: "#FFF8E1",
    textColor: "#F57F17",
  },
  {
    id: "orange",
    minCents: 2000,
    headerBg: "#EF6C00",
    bodyBg: "#FFF3E0",
    textColor: "#E65100",
  },
  {
    id: "magenta",
    minCents: 5000,
    headerBg: "#AD1457",
    bodyBg: "#FCE4EC",
    textColor: "#880E4F",
  },
];

export function commentDonationTier(amountCents: number): CommentDonationTier {
  let tier = COMMENT_DONATION_TIERS[0]!;
  for (const t of COMMENT_DONATION_TIERS) {
    if (amountCents >= t.minCents) tier = t;
  }
  return tier;
}

/** 상단 고정 티커 표시 시간 (ms) — 금액에 비례 */
export function commentDonationPinMs(amountCents: number): number {
  if (amountCents >= 5000) return 300_000;
  if (amountCents >= 2000) return 180_000;
  if (amountCents >= 1000) return 120_000;
  if (amountCents >= 500) return 90_000;
  if (amountCents >= 200) return 60_000;
  return 30_000;
}
