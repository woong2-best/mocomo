"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  getMarketplaceCart,
  removeFromMarketplaceCart,
  updateMarketplaceCartQuantity,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart-storage";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

function formatPrice(amount: number, _currency: string) {
  return formatMoney(amount);
}

export function MarketplaceCartView() {
  const [items, setItems] = useState<MarketplaceCartItem[]>([]);

  function refresh() {
    setItems(getMarketplaceCart());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("marketplace-cart-updated", refresh);
    return () => window.removeEventListener("marketplace-cart-updated", refresh);
  }, []);

  const total = items.reduce((sum, item) => sum + item.priceAmount * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-folk-cobalt/20 bg-folk-cream/40 px-6 py-14 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">장바구니가 비어 있습니다</p>
        <p className="text-xs text-muted-foreground">상품 상세에서 장바구니에 담아 보세요.</p>
        <Button asChild variant="secondary">
          <Link href="/market">쇼핑 계속하기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.listingId}
            className="flex gap-3 rounded-2xl border border-folk-cobalt/15 bg-background p-3"
          >
            <Link
              href={`/market/i/${item.listingId}`}
              className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/40"
            >
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                  No image
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1 space-y-2">
              <Link
                href={`/market/i/${item.listingId}`}
                className="block text-sm font-bold leading-snug hover:underline line-clamp-2"
              >
                {item.title}
              </Link>
              <p className="text-sm font-bold text-folk-terracotta">
                {formatPrice(item.priceAmount, item.currency)}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={item.quantity}
                  onChange={(e) => {
                    updateMarketplaceCartQuantity(item.listingId, Number(e.target.value) || 1);
                    refresh();
                  }}
                  className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                />
                <Button type="button" variant="ghost" size="sm" asChild>
                  <Link href={`/market/i/${item.listingId}`}>결제하기</Link>
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    removeFromMarketplaceCart(item.listingId);
                    refresh();
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-folk-cobalt/15 bg-folk-cream/50 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold">예상 합계</span>
        <span className="text-lg font-bold">{formatMoney(total)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        배송비·옵션은 상품별 결제 화면에서 확인됩니다.
      </p>
    </div>
  );
}
