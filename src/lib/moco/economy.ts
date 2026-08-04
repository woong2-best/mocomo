/**
 * 모코(MOCO) — 사이트 표시용 가상 재화 (실환전 아님).
 * 예: 2,000모코 후원 표시 ↔ Stripe 20,000원 결제
 * 수수료 10%는 크리에이터 정산 시(기존 Tip 파이프라인) 적용.
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
