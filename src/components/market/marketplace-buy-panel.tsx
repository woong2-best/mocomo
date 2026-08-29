"use client";

import { useMemo, useState } from "react";
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
  const [error, setError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutInput, setCheckoutInput] = useState<MarketplaceCheckoutInput | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shipName, setShipName] = useState("");
  const [shipCountry, setShipCountry] = useState(
    () => shipToCountries[0]?.toUpperCase() ?? "KR"
  );
  const [shipPostal, setShipPostal] = useState("");
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipPhone, setShipPhone] = useState("");

  const needsShip = listingType !== "DIGITAL";

  const shipsHere = useMemo(
    () =>
      !needsShip ||
      listingShipsToCountry(shipToCountries, shipsWorldwide, shipCountry),
    [needsShip, shipToCountries, shipsWorldwide, shipCountry]
  );

  function buy() {
    setError("");
    if (isAdult) return;
    if (!paymentsEnabled) {
      setError("결제가 설정되지 않았습니다.");
      return;
    }
    if (needsShip && !shipsHere) {
      setError(UNSUPPORTED_SHIP_COUNTRY_MESSAGE);
      return;
    }
    setCheckoutInput({
      listingId,
      quantity,
      shipName: needsShip ? shipName : undefined,
      shipCountry: needsShip ? shipCountry : undefined,
      shipPostal: needsShip ? shipPostal : undefined,
      shipAddress1: needsShip ? shipAddress1 : undefined,
      shipAddress2: needsShip ? shipAddress2 : undefined,
      shipPhone: needsShip ? shipPhone : undefined,
    });
    setSheetOpen(true);
  }

  function addCart() {
    if (isAdult) return;
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
          <p className="text-xs font-semibold text-muted-foreground">배송지</p>
          <Input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="이름" />
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
              placeholder="우편번호"
            />
          </div>
          {!shipsHere && (
            <p className="text-sm text-destructive">{UNSUPPORTED_SHIP_COUNTRY_MESSAGE}</p>
          )}
          <Input
            value={shipAddress1}
            onChange={(e) => setShipAddress1(e.target.value)}
            placeholder="주소"
          />
          <Input
            value={shipAddress2}
            onChange={(e) => setShipAddress2(e.target.value)}
            placeholder="상세주소"
          />
          <Input
            value={shipPhone}
            onChange={(e) => setShipPhone(e.target.value)}
            placeholder="전화번호"
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" disabled={stock <= 0} onClick={addCart}>
          장바구니
        </Button>
        <Button
          type="button"
          disabled={stock <= 0 || (needsShip && !shipsHere)}
          onClick={buy}
        >
          결제하기
        </Button>
      </div>
      <MarketplaceCheckoutSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        checkoutInput={checkoutInput}
        onSuccess={(result) => {
          if (result.redirectPath) router.push(result.redirectPath);
          else router.refresh();
        }}
      />
      <p className="text-[10px] text-muted-foreground text-center">
        Stripe Checkout · 카드 / Apple Pay / Google Pay 등 (국가별 자동)
      </p>
    </div>
  );
}
