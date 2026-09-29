"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Scale, ShoppingBag, DollarSign } from "lucide-react";
import { getMyUsedHubLane, type UsedHubLane } from "@/actions/used-market";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

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
  const { locale } = useLocale();
  const [lane, setLane] = useState<UsedHubLane>("selling");
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);

  const shortcuts: { lane: UsedHubLane; label: string; icon: typeof ShoppingBag }[] = [
    { lane: "purchased", label: uiText(locale, "구매내역", "Purchases"), icon: ShoppingBag },
    { lane: "selling", label: uiText(locale, "판매내역", "Sales"), icon: DollarSign },
    { lane: "favorites", label: uiText(locale, "찜리스트", "Favorites"), icon: Heart },
    { lane: "disputes", label: uiText(locale, "분쟁", "Disputes"), icon: Scale },
  ];

  const emptyMessage = (hubLane: UsedHubLane) => {
    switch (hubLane) {
      case "purchased":
        return uiText(locale, "구매한 상품이 없어요.", "No purchases yet.");
      case "selling":
        return uiText(locale, "판매한 글이 없어요.", "No listings yet.");
      case "live-auctions":
        return uiText(locale, "진행 중인 경매가 없어요.", "No live auctions.");
      case "favorites":
        return uiText(locale, "찜한 상품이 없어요.", "No favorites yet.");
      case "disputes":
        return uiText(locale, "분쟁 내역이 없어요.", "No disputes.");
      default:
        return "";
    }
  };

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
        {shortcuts.map((item) => {
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
        {uiText(locale, "판매", "Sell")}
      </Link>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {uiText(locale, "불러오는 중…", "Loading…")}
        </p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage(lane)}</p>
      ) : (
        <UsedListingGrid listings={items.map(toCard)} viewerUserId={userId} />
      )}
    </div>
  );
}
