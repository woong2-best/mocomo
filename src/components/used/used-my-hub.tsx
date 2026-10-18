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
  category?: string | null;
  productType?: string | null;
  subcultureMeta?: unknown;
  bidResult?: "live" | "won" | "lost";
};

const DIGITAL_IDS = new Set([
  "VTUBER_3D",
  "STREAMER_ASSET",
  "EMOTES_BADGES",
  "ILLUSTRATION",
  "AUDIO_MUSIC",
  "CREATOR_RESOURCES",
]);

function isDigitalItem(item: HubItem) {
  return item.category === "DIGITAL" || (!!item.productType && DIGITAL_IDS.has(item.productType));
}

function deliveryStatus(meta: unknown) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "held";
  const status = (meta as { digitalDelivery?: { status?: string } }).digitalDelivery?.status;
  return status === "progress" || status === "uploaded" || status === "completed" ? status : "held";
}

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
  const [purchaseTab, setPurchaseTab] = useState<"physical" | "digital" | "bids">("physical");
  const lane: UsedHubLane =
    initialLane === "purchased" && purchaseTab === "bids" ? "my-bids" : initialLane;

  const emptyMessage = (hubLane: UsedHubLane) => {
    switch (hubLane) {
      case "purchased":
        return t("ui.no_purchases_yet");
      case "sales":
      case "my":
      case "selling":
        return t("ui.no_listings_yet");
      case "live-auctions":
        return t("ui.no_live_auctions");
      case "my-bids":
        return t("ui.no_active_bids");
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

  const visible = items.filter((item) => {
    if (initialLane === "purchased" && purchaseTab !== "bids") {
      return purchaseTab === "digital" ? isDigitalItem(item) : !isDigitalItem(item);
    }
    return true;
  });

  const steps = [
    ["held", t("market.track.paymentHeld")],
    ["progress", t("market.track.inProgress")],
    ["uploaded", t("market.track.fileUploaded")],
    ["completed", t("market.track.completed")],
  ] as const;

  return (
    <div className="space-y-4">
      {initialLane === "purchased" ? (
        <div className="flex gap-2 overflow-x-auto">
          {([
            ["physical", "market.track.physicalOrders"],
            ["digital", "market.track.digitalRequests"],
            ["bids", "market.track.myBids"],
          ] as const).map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPurchaseTab(id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold ${
                purchaseTab === id ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border text-folk-cobalt"
              }`}
            >
              {t(key)}
            </button>
          ))}
        </div>
      ) : null}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("tower.loadingMore")}</p>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{emptyMessage(lane)}</p>
      ) : (
        <div className="space-y-3">
          {lane === "my-bids"
            ? visible.map((item) => (
                <p key={item.id} className="text-sm">
                  {item.title}
                  {item.bidResult === "lost" ? (
                    <span className="ml-2 font-bold text-destructive">{t("market.track.transactionFailed")}</span>
                  ) : null}
                </p>
              ))
            : null}
          {initialLane === "selling"
            ? visible.filter(isDigitalItem).map((item) => {
                const status = deliveryStatus(item.subcultureMeta);
                const index = steps.findIndex(([id]) => id === status);
                return (
                  <div key={item.id} className="rounded-xl border p-3">
                    <p className="mb-2 text-sm font-bold">{item.title}</p>
                    <ol className="flex flex-wrap gap-2 text-[11px]">
                      {steps.map(([id, label], stepIndex) => (
                        <li key={id} className={stepIndex <= index ? "font-extrabold text-folk-cobalt" : "text-muted-foreground"}>
                          {label}
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })
            : null}
          <UsedListingGrid listings={visible.map(toCard)} viewerUserId={userId} />
        </div>
      )}
    </div>
  );
}
