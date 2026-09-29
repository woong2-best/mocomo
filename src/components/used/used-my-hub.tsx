"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Heart, Scale, ShoppingBag, DollarSign } from "lucide-react";
import { getMyUsedHubLane, type UsedHubLane } from "@/actions/used-market";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { cn } from "@/lib/utils";

const SHORTCUTS: { lane: UsedHubLane; label: string; icon: typeof ShoppingBag }[] = [
  { lane: "purchased", label: "구매내역", icon: ShoppingBag },
  { lane: "selling", label: "판매내역", icon: DollarSign },
  { lane: "live-auctions", label: "진행중인경매", icon: Clock },
  { lane: "favorites", label: "찜리스트", icon: Heart },
  { lane: "disputes", label: "분쟁", icon: Scale },
];

const EMPTY: Record<UsedHubLane, string> = {
  purchased: "구매한 상품이 없어요.",
  selling: "판매한 글이 없어요.",
  "live-auctions": "진행 중인 경매가 없어요.",
  favorites: "찜한 상품이 없어요.",
  disputes: "분쟁 내역이 없어요.",
};

type HubItem = {
  id: string;
  title: string;
  price: number;
  currency?: string | null;
  thumbnailUrl?: string | null;
  region?: string | null;
  status: string;
  saleType?: string;
  createdAt?: string;
  updatedAt?: string;
  auctionEndsAt?: string | null;
  currentBidAmount?: number | null;
  bidCount?: number | null;
  favorited?: boolean;
  sellerId?: string;
};

function toCard(item: HubItem) {
  return {
    id: item.id,
    title: item.title,
    price: item.price,
    currency: item.currency,
    region: item.region ?? "",
    status: item.status,
    images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
    createdAt: new Date(item.createdAt ?? item.updatedAt ?? Date.now()),
    saleType: item.saleType,
    auctionEndsAt: item.auctionEndsAt,
    currentBidAmount: item.currentBidAmount,
    bidCount: item.bidCount ?? undefined,
    sellerId: item.sellerId,
    favorited: item.favorited,
  };
}

export function UsedMyHub({ userId }: { userId: string }) {
  const [lane, setLane] = useState<UsedHubLane>("selling");
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getMyUsedHubLane(lane).then((res) => {
      if (!alive) return;
      setItems((res.items ?? []) as HubItem[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [lane]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-1 pt-1">
        {SHORTCUTS.map((item) => {
          const Icon = item.icon;
          const active = lane === item.lane;
          return (
            <button
              key={item.lane}
              type="button"
              onClick={() => setLane(item.lane)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-center",
                active ? "bg-muted" : "hover:bg-muted/60"
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={1.6} />
              <span className="text-[11px] font-bold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>

      <Link
        href="/market/new"
        className="flex h-12 w-full items-center justify-center rounded-full bg-folk-terracotta text-base font-extrabold text-white hover:bg-folk-terracotta/90"
      >
        판매
      </Link>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{EMPTY[lane]}</p>
      ) : (
        <UsedListingGrid listings={items.map(toCard)} viewerUserId={userId} />
      )}
    </div>
  );
}
