import { describe, expect, it } from "vitest";
import {
  compareHistoryItemsDesc,
  encodeSettlementHistoryCursor,
  decodeSettlementHistoryCursor,
  mergeHistoryItemsDesc,
} from "@/lib/settlement-moco/history-cursor";
import type { UnifiedSettlementHistoryItem } from "@/lib/settlement-moco/history";

function row(
  partial: Partial<UnifiedSettlementHistoryItem> & Pick<UnifiedSettlementHistoryItem, "kind" | "id" | "at">,
): UnifiedSettlementHistoryItem {
  const { kind, ...rest } = partial;
  if (kind === "on_demand_withdrawal") {
    return {
      kind: "on_demand_withdrawal",
      status: "COMPLETED",
      withdrawMoco: 100,
      balanceAfterMoco: 0,
      payoutTier: "Pulse",
      activeTierBefore: "Pulse",
      activeTierAfter: "Novice",
      netAmountMinor: 4750,
      currency: "usd",
      stripeTransferId: "tr_1",
      ...rest,
    } as UnifiedSettlementHistoryItem;
  }
  return {
    kind: "monthly_cycle",
    periodYear: 2026,
    periodMonth: 1,
    status: "PAID",
    lockedMoco: 100,
    deductedMoco: 90,
    rolloverMoco: 10,
    netAmountMinor: 42750,
    currency: "usd",
    ...rest,
  } as UnifiedSettlementHistoryItem;
}

describe("settlement history cursor merge", () => {
  it("sorts merged items by at desc", () => {
    const items = [
      row({ kind: "monthly_cycle", id: "a", at: "2026-01-01T00:00:00.000Z" }),
      row({
        kind: "on_demand_withdrawal",
        id: "b",
        at: "2026-02-01T00:00:00.000Z",
      }),
    ];
    const { page } = mergeHistoryItemsDesc(items, 10);
    expect(page[0]?.id).toBe("b");
  });

  it("round-trips cursor encoding", () => {
    const c = { at: "2026-02-01T00:00:00.000Z", id: "x", kind: "on_demand_withdrawal" as const };
    const enc = encodeSettlementHistoryCursor(c);
    expect(decodeSettlementHistoryCursor(enc)).toEqual(c);
  });

  it("emits next cursor when page is full", () => {
    const items = Array.from({ length: 3 }).map((_, i) =>
      row({
        kind: "on_demand_withdrawal",
        id: `id_${i}`,
        at: new Date(Date.UTC(2026, 0, 10 - i)).toISOString(),
      }),
    );
    const { page, nextCursor, hasMore } = mergeHistoryItemsDesc(items, 2);
    expect(page).toHaveLength(2);
    expect(hasMore).toBe(true);
    expect(nextCursor?.id).toBe(page[1]?.id);
  });

  it("compareHistoryItemsDesc is stable", () => {
    expect(
      compareHistoryItemsDesc(
        { at: "2026-02-02T00:00:00.000Z", id: "a" },
        { at: "2026-02-01T00:00:00.000Z", id: "b" },
      ),
    ).toBeLessThan(0);
  });
});
