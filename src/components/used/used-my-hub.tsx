"use client";

import { useEffect, useState } from "react";
import { getMyUsedHubLane, type UsedHubLane } from "@/actions/used-market";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { useLocale } from "@/components/providers/locale-provider";

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

export function UsedMyHub({
  userId,
  initialLane = "selling",
}: {
  userId: string;
  initialLane?: UsedHubLane;
}) {
  const { t } = useLocale();
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);

  const emptyMessage = (hubLane: UsedHubLane) => {
    switch (hubLane) {
      case "purchased":
        return t("ui.no_purchases_yet");
      case "selling":
        return t("ui.no_listings_yet");
      case "live-auctions":
        return t("ui.no_live_auctions");
      case "favorites":
        return t("ui.no_favorites_yet");
      case "disputes":
        return t("ui.no_disputes");
      default:
        return "";
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getMyUsedHubLane(initialLane).then((res) => {
      if (!alive) return;
      setItems((res.items ?? []) as HubItem[]);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [initialLane]);

  if (loading) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {t("tower.loadingMore")}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {emptyMessage(initialLane)}
      </p>
    );
  }

  return <UsedListingGrid listings={items.map(toCard)} viewerUserId={userId} />;
}
