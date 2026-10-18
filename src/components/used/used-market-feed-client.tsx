"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import { getMyUsedHubLane, getUsedListings } from "@/actions/used-market";
import { listingTrackFilter, parseMarketLane } from "@/lib/market-browse";
import { listingImages } from "@/lib/used-market";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { Button } from "@/components/ui/button";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

type Props = {
  q?: string;
  category?: string;
  product?: string;
  track?: string;
  lane?: string;
  region?: string;
  sido?: string;
  condition?: string;
  limited?: string;
  trade?: string;
  work?: string;
  anime?: string;
};

export function UsedMarketFeedClient(props: Props) {
  const [listings, setListings] = useState<Parameters<typeof UsedListingGrid>[0]["listings"]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setNeedsSignIn(false);
    void (async () => {
      try {
        const lane = parseMarketLane(props.lane);
        if (lane) {
          const hub = await getMyUsedHubLane(lane);
          if (!alive) return;
          setListings(
            hub.items.map((item) => ({
              id: item.id,
              title: item.title,
              price: item.price,
              currency: item.currency,
              region: item.region ?? "",
              status: item.status,
              images: item.thumbnailUrl ? [item.thumbnailUrl] : [],
              createdAt: new Date(item.createdAt),
              saleType: item.saleType,
              auctionEndsAt: item.auctionEndsAt,
              currentBidAmount: item.currentBidAmount,
              bidCount: item.bidCount ?? undefined,
              sellerId: item.sellerId,
            }))
          );
          return;
        }
        const track = listingTrackFilter(props.track);
        const rows = await getUsedListings(
          {
            q: props.q?.trim() || undefined,
            region: props.region,
            sido: props.sido,
            category: track === "digital" ? undefined : props.category,
            product: track === "physical" ? undefined : props.product,
            track,
            condition: props.condition,
            limited: props.limited,
            trade: props.trade,
            work: props.work,
            anime: props.anime,
            status: "SELLING",
            take: props.q?.trim() ? 80 : 48,
          },
          {}
        );
        if (!alive) return;
        setListings(
          rows.map((listing) => ({
            id: listing.id,
            title: listing.title,
            price: listing.price,
            currency: listing.currency,
            region: listing.region,
            status: listing.status,
            images: listingImages(listing.images),
            createdAt: listing.createdAt,
            saleType: listing.saleType,
            auctionEndsAt: listing.auctionEndsAt,
            currentBidAmount: listing.currentBidAmount,
            bidCount: listing.bidCount ?? undefined,
            sellerId: listing.sellerId,
            isNsfw: listing.isNsfw,
          }))
        );
      } catch (err) {
        if (!alive) return;
        if (props.lane) {
          setNeedsSignIn(true);
          setListings([]);
        } else {
          setError(err instanceof Error ? err.message : "Could not load listings.");
          setListings([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [
    props.q,
    props.category,
    props.product,
    props.track,
    props.lane,
    props.region,
    props.sido,
    props.condition,
    props.limited,
    props.trade,
    props.work,
    props.anime,
  ]);

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">…</p>;
  }
  if (needsSignIn) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">{t("market.sign_in_to_view_trades")}</p>
        <Button variant="secondary" asChild>
          <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(`/market?lane=${props.lane || ""}`)}`}>
            {t("auth.signInRequired")}
          </Link>
        </Button>
      </div>
    );
  }
  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>;
  }
  if (listings.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">{t("app.market.sxn1r68")}</p>
      </div>
    );
  }
  return <UsedListingGrid listings={listings} />;
}
