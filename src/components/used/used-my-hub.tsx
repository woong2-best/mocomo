"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Scale, ShoppingBag, DollarSign } from "lucide-react";
import { getMyUsedHubLane, type UsedHubLane } from "@/actions/used-market";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { cn } from "@/lib/utils";
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

function parseInitialLane(raw?: string | null): UsedHubLane {
  if (raw === "purchased" || raw === "selling" || raw === "favorites" || raw === "disputes") {
    return raw;
  }
  return "selling";
}

export function UsedMyHub({
  userId,
  initialLane = "selling",
}: {
  userId: string;
  initialLane?: UsedHubLane;
}) {
  const { locale , t } = useLocale();
  const [lane, setLane] = useState<UsedHubLane>(() => parseInitialLane(initialLane));
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);

  const shortcuts: { lane: UsedHubLane; label: string; icon: typeof ShoppingBag }[] = [
    { lane: "purchased", label: t("ui.purchases"), icon: ShoppingBag },
    { lane: "selling", label: t("ui.sales"), icon: DollarSign },
    { lane: "favorites", label: t("ui.favorites"), icon: Heart },
    { lane: "disputes", label: t("ui.disputes"), icon: Scale },
  ];

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
        {t("ui.sell")}
      </Link>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("tower.loadingMore")}
        </p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage(lane)}</p>
      ) : (
        <UsedListingGrid listings={items.map(toCard)} viewerUserId={userId} />
      )}
    </div>
  );
}
