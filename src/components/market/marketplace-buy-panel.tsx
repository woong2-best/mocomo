"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MarketplaceCheckoutInput } from "@/actions/marketplace-checkout";
import { addToMarketplaceCart } from "@/lib/marketplace/cart-storage";
import { MarketplaceCheckoutSheet } from "@/components/payments/marketplace-checkout-sheet";
import { AdultMonetizationNotice } from "@/components/legal/adult-monetization-notice";
import { Button } from "@/components/ui/button";
import { isAdultContent } from "@/lib/content-rating";
import type { ContentRating } from "@prisma/client";
import { formatUsd } from "@/lib/money";
import { Input } from "@/components/ui/input";
import {
  listingShipsToCountry,
  MARKETPLACE_SHIP_COUNTRIES,
  UNSUPPORTED_SHIP_COUNTRY_MESSAGE,
} from "@/lib/marketplace/shipping-config";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

type CheckoutEligibility = {
  mode: "STRIPE" | "BLOCKED";
  primaryButtonLabel: string;
  disclaimer: string;
  sellerReady: boolean;
  sellerReadyMessage?: string;
  blocked?: boolean;
};

export function MarketplaceBuyPanel({
  listingId,
  listingTitle,
  listingCoverUrl,
  listingCurrency = "usd",
  listingType,
  priceAmount,
  stock,
  paymentsEnabled,
  shipToCountries = [],
  shipsWorldwide = false,
  contentRating = "GENERAL",
}: {
  listingId: string;
  listingTitle: string;
  listingCoverUrl?: string | null;
  listingCurrency?: string;
  listingType: string;
  priceAmount: number;
  stock: number;
  paymentsEnabled: boolean;
  shipToCountries?: string[];
  shipsWorldwide?: boolean;
  contentRating?: ContentRating;
}) {
  const isAdult = isAdultContent(contentRating);
  const router = useRouter();
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [stripeSheetOpen, setStripeSheetOpen] = useState(false);
  const [checkoutInput, setCheckoutInput] = useState<MarketplaceCheckoutInput | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shipName, setShipName] = useState("");
  const [shipCountry, setShipCountry] = useState(
    () => shipToCountries[0]?.toUpperCase() ?? "US"
  );
  const [shipPostal, setShipPostal] = useState("");
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [eligibility, setEligibility] = useState<CheckoutEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);

  const needsShip = listingType !== "DIGITAL";
  const blocked = eligibility?.mode === "BLOCKED" || eligibility?.blocked;

  const shipsHere = useMemo(
    () =>
      !needsShip ||
      listingShipsToCountry(shipToCountries, shipsWorldwide, shipCountry),
    [needsShip, shipToCountries, shipsWorldwide, shipCountry]
  );

  useEffect(() => {
    if (!paymentsEnabled || isAdult) return;
    setEligibilityLoading(true);
    const params = new URLSearchParams({ listingId });
    if (needsShip && shipCountry) params.set("shipCountry", shipCountry);
    void fetch(`/api/market/checkout-mode?${params}`)
      .then((r) => r.json())
      .then((data: CheckoutEligibility & { error?: string }) => {
        if (!data.error && data.mode) setEligibility(data);
      })
      .catch(() => setEligibility(null))
      .finally(() => setEligibilityLoading(false));
  }, [listingId, shipCountry, needsShip, paymentsEnabled, isAdult]);

  function buildCheckoutInput(): MarketplaceCheckoutInput {
    return {
      listingId,
      quantity,
      shipName: needsShip ? shipName : undefined,
      shipCountry: needsShip ? shipCountry : undefined,
      shipPostal: needsShip ? shipPostal : undefined,
      shipAddress1: needsShip ? shipAddress1 : undefined,
      shipAddress2: needsShip ? shipAddress2 : undefined,
      shipPhone: needsShip ? shipPhone : undefined,
    };
  }

  function buy() {
    setError("");
    if (isAdult) return;
    if (blocked) {
      setError(eligibility?.disclaimer ?? t("market.unavailable"));
      return;
    }
    if (!paymentsEnabled) {
      setError(t("market.paymentsDisabled"));
      return;
    }
    if (needsShip && !shipsHere) {
      setError(UNSUPPORTED_SHIP_COUNTRY_MESSAGE);
      return;
    }
    if (eligibility && !eligibility.sellerReady) {
      setError(eligibility.sellerReadyMessage ?? t("market.sellerNotReady"));
      return;
    }
    const input = buildCheckoutInput();
    setCheckoutInput(input);
    setStripeSheetOpen(true);
  }

  function addCart() {
    if (isAdult || blocked) return;
    addToMarketplaceCart(
      {
        listingId,
        title: listingTitle,
        priceAmount,
        currency: listingCurrency,
        coverUrl: listingCoverUrl ?? null,
      },
      quantity
    );
  }

  const buyLabel = eligibility?.primaryButtonLabel ?? t("market.buyNow");

  if (isAdult) {
    return (
      <div className="space-y-3 rounded-2xl border border-border/60 p-4">
        <AdultMonetizationNotice />
        <p className="text-sm text-muted-foreground">
          이 상품은 성인 콘텐츠로 분류되어 플랫폼 내 결제·구매가 불가합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold text-primary">{formatUsd(priceAmount)}</p>
        {listingType !== "DIGITAL" && (
          <Input
            type="number"
            min={1}
            max={Math.max(1, stock)}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            className="w-20"
          />
        )}
      </div>

      {needsShip && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">{t("market.shippingAddress")}</p>
          <Input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder={t("market.name")} />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              value={shipCountry}
              onChange={(e) => {
                setShipCountry(e.target.value);
                setError("");
              }}
            >
              {MARKETPLACE_SHIP_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.labelKo} ({c.code})
                </option>
              ))}
            </select>
            <Input
              value={shipPostal}
              onChange={(e) => setShipPostal(e.target.value)}
              placeholder={t("market.postal")}
            />
          </div>
          {!shipsHere && (
            <p className="text-sm text-destructive">{UNSUPPORTED_SHIP_COUNTRY_MESSAGE}</p>
          )}
          <Input
            value={shipAddress1}
            onChange={(e) => setShipAddress1(e.target.value)}
            placeholder={t("market.address")}
          />
          <Input
            value={shipAddress2}
            onChange={(e) => setShipAddress2(e.target.value)}
            placeholder={t("market.address2")}
          />
          <Input
            value={shipPhone}
            onChange={(e) => setShipPhone(e.target.value)}
            placeholder={t("market.phone")}
          />
        </div>
      )}

      {eligibility?.disclaimer ? (
        <p
          className={`text-xs leading-relaxed rounded-lg px-3 py-2 ${
            blocked
              ? "bg-destructive/5 text-destructive border border-destructive/20"
              : "bg-muted/40 text-muted-foreground"
          }`}
        >
          {eligibility.disclaimer}
        </p>
      ) : null}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" disabled={stock <= 0 || blocked} onClick={addCart}>
          {t("market.addToCart")}
        </Button>
        <Button
          type="button"
          disabled={
            stock <= 0 ||
            blocked ||
            (needsShip && !shipsHere) ||
            eligibilityLoading ||
            (eligibility !== null && !eligibility.sellerReady)
          }
          onClick={buy}
        >
          {eligibilityLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
          ) : (
            buyLabel
          )}
        </Button>
      </div>

      <MarketplaceCheckoutSheet
        open={stripeSheetOpen}
        onOpenChange={setStripeSheetOpen}
        checkoutInput={checkoutInput}
        onSuccess={(result) => {
          if (result.redirectPath) router.push(result.redirectPath);
          else if (result.marketplaceOrderId) router.push(`/market/orders/${result.marketplaceOrderId}`);
          else router.refresh();
        }}
      />

      <p className="text-[10px] text-muted-foreground text-center">
        {t("market.stripeDisclaimer")} · {t("market.mediatorNotice")}
      </p>
    </div>
  );
}
