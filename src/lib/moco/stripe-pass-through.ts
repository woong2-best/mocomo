import { MOCO_USD_CENTS } from "@/lib/gems/constants";

/** Stripe card processing (international) — env override for regional pricing */
export const STRIPE_PG_PERCENT = Number(process.env.STRIPE_PG_PERCENT ?? "0.044");
export const STRIPE_PG_FIXED_CENTS = Number(process.env.STRIPE_PG_FIXED_CENTS ?? "30");

/** Hybrid pass-through: platform keeps 5% of MOCO face value (not gross). */
export const MOCO_PLATFORM_MARGIN_RATE = 0.05;
export const MOCO_CREATOR_ALLOCATION_RATE = 1 - MOCO_PLATFORM_MARGIN_RATE;

export type MocoTopupLedgerQuote = {
  mocoQuantity: number;
  basePriceCents: number;
  pgFeeCents: number;
  grossAmountCents: number;
  platformRevenueCents: number;
  creatorAllocationCents: number;
};

/** Gross charge so net after Stripe ≈ basePrice + fixed fee share. */
export function grossCentsFromBasePrice(basePriceCents: number): number {
  if (basePriceCents <= 0) return 0;
  const pct = STRIPE_PG_PERCENT;
  if (pct >= 1) return basePriceCents;
  return Math.ceil((basePriceCents + STRIPE_PG_FIXED_CENTS) / (1 - pct));
}

export function pgFeeCentsFromGross(grossAmountCents: number, basePriceCents: number): number {
  return Math.max(0, grossAmountCents - basePriceCents);
}

export function splitMocoFaceValueCents(basePriceCents: number): {
  platformRevenueCents: number;
  creatorAllocationCents: number;
} {
  const platformRevenueCents = Math.round(basePriceCents * MOCO_PLATFORM_MARGIN_RATE);
  const creatorAllocationCents = basePriceCents - platformRevenueCents;
  return { platformRevenueCents, creatorAllocationCents };
}

export function quoteMocoTopupLedger(mocoQuantity: number): MocoTopupLedgerQuote {
  const moco = Math.max(0, Math.floor(mocoQuantity));
  const basePriceCents = moco * MOCO_USD_CENTS;
  const grossAmountCents = grossCentsFromBasePrice(basePriceCents);
  const pgFeeCents = pgFeeCentsFromGross(grossAmountCents, basePriceCents);
  const { platformRevenueCents, creatorAllocationCents } = splitMocoFaceValueCents(basePriceCents);
  return {
    mocoQuantity: moco,
    basePriceCents,
    pgFeeCents,
    grossAmountCents,
    platformRevenueCents,
    creatorAllocationCents,
  };
}

/** Creator net USD per 1 MOCO face (display / tier tables). */
export function mocoCreatorNetUsd(moco: number): number {
  return Math.max(0, Math.floor(moco)) * (MOCO_USD_CENTS / 100) * MOCO_CREATOR_ALLOCATION_RATE;
}
