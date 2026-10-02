import type { UnifiedSettlementHistoryItem } from "@/lib/settlement-moco/history";

export function formatHistoryNetAmount(item: UnifiedSettlementHistoryItem): string {
  if (item.kind === "monthly_cycle") {
    if (item.netAmountMinor == null || !item.currency) {
      return `${item.deductedMoco.toLocaleString()} MOCO`;
    }
    return formatMinor(item.netAmountMinor, item.currency);
  }
  return formatMinor(item.netAmountMinor, item.currency);
}

export function formatMinor(minor: number, currency: string): string {
  const c = currency.toLowerCase();
  if (c === "usd") {
    return (minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  if (c === "krw") {
    return `₩${minor.toLocaleString()}`;
  }
  return `${minor.toLocaleString()} ${currency.toUpperCase()}`;
}

export function formatHistoryDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function historyItemTitle(item: UnifiedSettlementHistoryItem): string {
  if (item.kind === "on_demand_withdrawal") {
    return `Instant · ${item.withdrawMoco.toLocaleString()} MOCO`;
  }
  return `Monthly · ${item.periodYear}.${String(item.periodMonth).padStart(2, "0")}`;
}

export function historyItemSubtitle(item: UnifiedSettlementHistoryItem): string {
  if (item.kind === "on_demand_withdrawal") {
    const tail = item.stripeTransferId ? ` · ${item.stripeTransferId.slice(0, 14)}…` : "";
    return `${item.status} · ${item.payoutTier}${tail}`;
  }
  return `${item.status} · locked ${item.lockedMoco.toLocaleString()} MOCO`;
}
