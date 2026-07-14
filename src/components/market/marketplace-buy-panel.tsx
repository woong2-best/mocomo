"use client";

import { useState, useTransition } from "react";
import { createMarketplaceCheckout } from "@/actions/marketplace-checkout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketplaceBuyPanel({
  listingId,
  listingType,
  priceAmount,
  stock,
  paymentsEnabled,
}: {
  listingId: string;
  listingType: string;
  priceAmount: number;
  stock: number;
  paymentsEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [shipName, setShipName] = useState("");
  const [shipCountry, setShipCountry] = useState("KR");
  const [shipPostal, setShipPostal] = useState("");
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipPhone, setShipPhone] = useState("");

  const needsShip = listingType !== "DIGITAL";

  function buy() {
    setError("");
    if (!paymentsEnabled) {
      setError("결제가 설정되지 않았습니다.");
      return;
    }
    startTransition(async () => {
      const res = await createMarketplaceCheckout({
        listingId,
        quantity,
        shipName: needsShip ? shipName : undefined,
        shipCountry: needsShip ? shipCountry : undefined,
        shipPostal: needsShip ? shipPostal : undefined,
        shipAddress1: needsShip ? shipAddress1 : undefined,
        shipAddress2: needsShip ? shipAddress2 : undefined,
        shipPhone: needsShip ? shipPhone : undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("checkoutUrl" in res && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-lg font-bold text-primary">{priceAmount.toLocaleString()}원</p>
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
            <Input
              value={shipCountry}
              onChange={(e) => setShipCountry(e.target.value)}
              placeholder="국가 코드 (예: KR)"
            />
            <Input
              value={shipPostal}
              onChange={(e) => setShipPostal(e.target.value)}
              placeholder="우편번호"
            />
          </div>
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
      <Button type="button" className="w-full" disabled={pending || stock <= 0} onClick={buy}>
        {pending ? "결제 준비 중…" : "결제하기"}
      </Button>
      <p className="text-[10px] text-muted-foreground text-center">
        Stripe Checkout · 카드 / Apple Pay / Google Pay 등 (국가별 자동)
      </p>
    </div>
  );
}
