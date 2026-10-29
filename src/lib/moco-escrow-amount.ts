import { SALE_MOCO_USD_CENTS } from "@/lib/money";
import { krwToMoco } from "@/lib/moco/economy";

/** Whole MOCO taken from the buyer and held for the seller. */
export function escrowMocoFromListingPrice(
  price: number,
  currency: string | null | undefined
): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  const code = (currency ?? "krw").toLowerCase();
  if (code === "moco" || code === "moc") {
    const whole = Math.floor(price);
    return whole >= 1 ? whole : null;
  }
  if (code === "krw") {
    const whole = krwToMoco(price);
    return whole >= 1 ? whole : null;
  }
  if (code === "usd") {
    const whole = Math.floor(price / SALE_MOCO_USD_CENTS);
    return whole >= 1 ? whole : null;
  }
  return null;
}
