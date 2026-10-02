"use client";

import { useCallback, useEffect, useState } from "react";
import { WalletMembershipStrip } from "@/components/wallet/wallet-card-stack";
import { Button } from "@/components/ui/button";
import {
  formatHistoryDate,
  formatHistoryNetAmount,
  historyItemSubtitle,
  historyItemTitle,
} from "@/lib/settlement-moco/history-format";
import type { UnifiedSettlementHistoryItem } from "@/lib/settlement-moco/history";
import { cn } from "@/lib/utils";

type HistoryPage = {
  items: UnifiedSettlementHistoryItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

type Props = {
  /** Bump to refetch from the first page (e.g. after on-demand withdraw). */
  refreshKey?: number;
};

export function UnifiedSettlementHistoryPanel({ refreshKey = 0 }: Props) {
  const [items, setItems] = useState<UnifiedSettlementHistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (cursor: string | null, append: boolean) => {
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/settlements/history?${params.toString()}`);
    const data = (await res.json()) as HistoryPage | { error?: string };
    if (!res.ok) {
      throw new Error("error" in data && data.error ? data.error : "Failed to load history");
    }
    const page = data as HistoryPage;
    setItems((prev) => (append ? [...prev, ...page.items] : page.items));
    setNextCursor(page.nextCursor);
    setHasMore(page.hasMore);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadPage(null, false)
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load history");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage, refreshKey]);

  async function loadMore() {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadPage(nextCursor, true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <p className="font-bold">Reward payout history</p>
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!loading && items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No payout history yet.</p>
      ) : null}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="space-y-1">
            <div className="flex items-center gap-2 px-0.5">
              <PayoutTypeBadge kind={item.kind} />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatHistoryDate(item.at)}
              </span>
            </div>
            <WalletMembershipStrip
              title={historyItemTitle(item)}
              subtitle={historyItemSubtitle(item)}
              right={formatHistoryNetAmount(item)}
              tone={item.status === "COMPLETED" || item.status === "PAID" ? "forest" : "muted"}
            />
          </div>
        ))}
      </div>
      {hasMore ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

function PayoutTypeBadge({ kind }: { kind: UnifiedSettlementHistoryItem["kind"] }) {
  const instant = kind === "on_demand_withdrawal";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        instant
          ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
          : "bg-sky-500/15 text-sky-800 dark:text-sky-300",
      )}
    >
      {instant ? "🟣 Instant payout" : "🔵 Monthly batch"}
    </span>
  );
}
