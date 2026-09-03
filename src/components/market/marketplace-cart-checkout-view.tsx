"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getMarketplaceCart,
  removeFromMarketplaceCart,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart-storage";
import { MARKETPLACE_SHIP_COUNTRIES } from "@/lib/marketplace/shipping-config";
import {
  checkoutMarketplaceCartForSeller,
  getMarketplaceCartCheckoutSummary,
} from "@/actions/marketplace-cart-checkout";
import { MarketplaceCheckoutSheet } from "@/components/payments/marketplace-checkout-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/money";
import { Loader2 } from "lucide-react";

type Summary = Awaited<ReturnType<typeof getMarketplaceCartCheckoutSummary>>;

export function MarketplaceCartCheckoutView() {
  const router = useRouter();
  const { t } = useLocale();
  const [cartItems, setCartItems] = useState<MarketplaceCartItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shipName, setShipName] = useState("");
  const [shipCountry, setShipCountry] = useState("US");
  const [shipPostal, setShipPostal] = useState("");
  const [shipAddress1, setShipAddress1] = useState("");
  const [shipAddress2, setShipAddress2] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [activeSellerId, setActiveSellerId] = useState<string | null>(null);
  const [stripeSheetOpen, setStripeSheetOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [preparedCheckout, setPreparedCheckout] = useState<{
    orderId: string;
    marketplaceOrderId?: string;
    clientSecret?: string | null;
    publishableKey?: string;
    methods?: import("@/lib/stripe-payment-methods").SavedPaymentMethod[];
    amount: number;
    orderName: string;
    mocoBalance?: number;
    mocoRequired?: number;
    canPayWithMoco?: boolean;
  } | null>(null);

  const cartSummary =
    summary && "groups" in summary && !("error" in summary) ? summary : null;
  const blocked = cartSummary?.blocked === true;

  useEffect(() => {
    const items = getMarketplaceCart();
    setCartItems(items);
    if (!items.length) {
      setLoading(false);
      return;
    }
    void getMarketplaceCartCheckoutSummary(
      items.map((i) => ({ listingId: i.listingId, quantity: i.quantity }))
    )
      .then(setSummary)
      .catch(() => setError(t("market.loadSummaryFailed")))
      .finally(() => setLoading(false));
  }, []);

  useMemo(() => summary, [summary]);

  async function checkoutSeller(sellerId: string, lines: { listingId: string; quantity: number }[]) {
    setError("");
    if (blocked) {
      setError(cartSummary?.disclaimer ?? t("market.regionBlocked"));
      return;
    }
    setPaying(true);
    const body = {
      items: lines,
      shipName: shipName || undefined,
      shipCountry: shipCountry || undefined,
      shipPostal: shipPostal || undefined,
      shipAddress1: shipAddress1 || undefined,
      shipAddress2: shipAddress2 || undefined,
      shipPhone: shipPhone || undefined,
    };

    const result = await checkoutMarketplaceCartForSeller(sellerId, body);
    setPaying(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("orderId" in result && result.orderId) {
      setPreparedCheckout(result as typeof preparedCheckout);
      setActiveSellerId(sellerId);
      setStripeSheetOpen(true);
    }
  }

  function onCheckoutSuccess(marketplaceOrderId?: string) {
    if (activeSellerId && cartSummary) {
      const group = cartSummary.groups.find((g) => g.sellerId === activeSellerId);
      if (group) {
        for (const line of group.lines) {
          removeFromMarketplaceCart(line.listingId);
        }
      }
    }
    if (marketplaceOrderId) {
      router.push(`/market/orders/${marketplaceOrderId}`);
    } else {
      router.push("/market/orders");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-folk-cobalt/20 px-6 py-14 text-center space-y-3">
        <p className="text-sm font-semibold">{t("market.cartEmpty")}</p>
        <Button asChild variant="secondary">
          <Link href="/market">{t("market.continueShopping")}</Link>
        </Button>
      </div>
    );
  }

  if (!cartSummary) {
    return (
      <p className="text-sm text-destructive">
        {summary && "error" in summary ? summary.error : error}
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div
        className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
          blocked
            ? "bg-destructive/5 text-destructive border border-destructive/20"
            : "bg-muted/40 text-muted-foreground"
        }`}
      >
        {cartSummary.disclaimer}
      </div>

      {!blocked ? (
        <div className="rounded-2xl border border-border/60 p-4 space-y-3">
          <p className="text-sm font-semibold">{t("market.shippingAddress")}</p>
          <Input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder={t("market.name")} />
          <select
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={shipCountry}
            onChange={(e) => setShipCountry(e.target.value)}
          >
            {MARKETPLACE_SHIP_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.labelKo} ({c.code})
              </option>
            ))}
          </select>
          <Input value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} placeholder={t("market.postal")} />
          <Input value={shipAddress1} onChange={(e) => setShipAddress1(e.target.value)} placeholder={t("market.address")} />
          <Input value={shipAddress2} onChange={(e) => setShipAddress2(e.target.value)} placeholder={t("market.address2")} />
          <Input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} placeholder={t("market.phone")} />
        </div>
      ) : null}

      {cartSummary.groups.map((group) => (
        <section key={group.sellerId} className="rounded-2xl border border-folk-cobalt/15 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">{group.sellerDisplayName}</p>
            <p className="text-sm font-bold text-primary">{formatUsd(group.total)}</p>
          </div>
          <ul className="space-y-2 text-sm">
            {group.lines.map((line) => (
              <li key={line.listingId} className="flex justify-between gap-2">
                <span className="line-clamp-1">{line.title} × {line.quantity}</span>
                <span className="shrink-0">{formatUsd(line.unitPrice * line.quantity)}</span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="w-full"
            disabled={paying || blocked}
            onClick={() => void checkoutSeller(group.sellerId, group.lines)}
          >
            {paying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("market.checkoutStripe")
            )}
          </Button>
        </section>
      ))}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <MarketplaceCheckoutSheet
        open={stripeSheetOpen}
        onOpenChange={setStripeSheetOpen}
        checkoutInput={null}
        prepared={preparedCheckout}
        onSuccess={(r) => onCheckoutSuccess(r.marketplaceOrderId ?? preparedCheckout?.marketplaceOrderId)}
      />
    </div>
  );
}
