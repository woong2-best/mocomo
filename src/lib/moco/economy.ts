/**
 * MOCO 가상재화 — 두 종류:
 * - purchasedMoco (User.gemBalance + PlatformWallet.mocoPoints): 충전만으로 정산 등급·출금 불가.
 * - earnedMoco (PlatformWallet.settlementMocoPoints): 후원 수령 시 1:1 적립, 월간 등급 차감 후 잔여 이월.
 * 1 MOCO = 10 KRW 표시 단위 (체크아웃·탑업).
 * 경매 입찰 보증금 가치: 1 MOCO = $5 — src/lib/auction-deposit/constants.ts
 */

/** 1 모코 = 10 KRW */
export const MOCO_KRW_PER_UNIT = 10;

export const MOCO_TOPUP_PACKAGES = [
  { moco: 500, krw: 5_000, label: "500 모코" },
  { moco: 2_000, krw: 20_000, label: "2,000 모코" },
  { moco: 5_000, krw: 50_000, label: "5,000 모코" },
  { moco: 10_000, krw: 100_000, label: "10,000 모코" },
] as const;

export function mocoToKrw(moco: number): number {
  return Math.max(0, Math.floor(moco)) * MOCO_KRW_PER_UNIT;
}

export function krwToMoco(krw: number): number {
  return Math.floor(Math.max(0, krw) / MOCO_KRW_PER_UNIT);
}

export function findMocoTopupPackage(moco: number) {
  return MOCO_TOPUP_PACKAGES.find((p) => p.moco === moco) ?? null;
}
