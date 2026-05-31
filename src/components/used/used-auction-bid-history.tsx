"use client";

import { useEffect, useState } from "react";
import { getUsedAuctionBids } from "@/actions/used-auction";
import { formatUsedPrice, formatUsedTimeAgo } from "@/lib/used-market";
import { maskBidderName } from "@/lib/used-auction";

export function UsedAuctionBidHistory({ listingId }: { listingId: string }) {
  const [bids, setBids] = useState<
    { id: string; amount: number; createdAt: Date; bidder: { username: string } }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void getUsedAuctionBids(listingId).then((res) => {
      if (cancelled) return;
      setBids(
        (res.bids ?? []).map((b) => ({
          id: b.id,
          amount: b.amount,
          createdAt: b.createdAt,
          bidder: b.bidder,
        }))
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground py-2">입찰 내역 불러오는 중…</p>;
  }
  if (bids.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">아직 입찰이 없습니다.</p>;
  }

  return (
    <ul className="divide-y border rounded-xl overflow-hidden text-sm">
      {bids.map((b, i) => (
        <li key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-card">
          <span className="text-muted-foreground">
            {i === 0 ? (
              <span className="text-orange-500 font-semibold mr-1">최고</span>
            ) : null}
            {maskBidderName(b.bidder.username)}
          </span>
          <span className="font-bold tabular-nums">{formatUsedPrice(b.amount)}</span>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
            {formatUsedTimeAgo(b.createdAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
