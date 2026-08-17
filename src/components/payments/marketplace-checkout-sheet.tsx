"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  confirmMarketplacePayment,
  createMarketplaceCheckoutRedirect,
  payMarketplaceWithSavedCard,
  prepareMarketplacePayment,
} from "@/actions/checkout-payment";
import type { MarketplaceCheckoutInput } from "@/actions/marketplace-checkout";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { CreditCard, Loader2, Plus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutInput: MarketplaceCheckoutInput | null;
  onSuccess?: (result: { marketplaceOrderId?: string; redirectPath?: string }) => void;
};

export function MarketplaceCheckoutSheet({
  open,
  onOpenChange,
  checkoutInput,
  onSuccess,
}: Props) {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [marketplaceOrderId, setMarketplaceOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [orderName, setOrderName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (!open || !checkoutInput) return;
    setError("");
    setLoading(true);
    void prepareMarketplacePayment(checkoutInput)
      .then((res) => {
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        if (!("orderId" in res) || !res.orderId) return;
        setOrderId(res.orderId);
        setMarketplaceOrderId(res.marketplaceOrderId ?? null);
        setAmount(res.amount ?? 0);
        setOrderName(res.orderName ?? "");
        setMethods(res.methods ?? []);
        const defaultPm =
          (res.methods ?? []).find((m: SavedPaymentMethod) => m.isDefault) ??
          (res.methods ?? [])[0];
        setSelectedId(defaultPm?.id ?? null);
        if (res.publishableKey) {
          setStripePromise(loadStripe(res.publishableKey));
        }
      })
      .finally(() => setLoading(false));
  }, [open, checkoutInput]);

  const handle3ds = useCallback(
    async (secret: string, oid: string) => {
      if (!stripePromise) return;
      const stripe = await stripePromise;
      if (!stripe) {
        setError("Stripe를 불러오지 못했습니다.");
        return;
      }
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(secret);
      if (confirmError) {
        setError(confirmError.message ?? "인증에 실패했습니다.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setError("결제가 완료되지 않았습니다.");
        return;
      }
      const done = await confirmMarketplacePayment(oid);
      if ("error" in done && done.error) {
        setError(done.error);
        return;
      }
      if ("success" in done && done.success) {
        onOpenChange(false);
        onSuccess?.({
          marketplaceOrderId: marketplaceOrderId ?? undefined,
          redirectPath: done.redirectPath,
        });
      }
    },
    [marketplaceOrderId, onOpenChange, onSuccess, stripePromise]
  );

  function paySelected() {
    if (!orderId || !selectedId) {
      setError("카드를 선택해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await payMarketplaceWithSavedCard(orderId, selectedId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("requiresAction" in res && res.requiresAction && res.clientSecret) {
        await handle3ds(res.clientSecret, res.orderId);
        return;
      }
      if ("success" in res && res.success) {
        onOpenChange(false);
        onSuccess?.({
          marketplaceOrderId: marketplaceOrderId ?? undefined,
          redirectPath: res.redirectPath,
        });
      }
    });
  }

  async function redirectCheckout() {
    if (!orderId) return;
    setError("");
    const res = await createMarketplaceCheckoutRedirect(orderId);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("checkoutUrl" in res && res.checkoutUrl) {
      window.location.href = res.checkoutUrl;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>결제 수단 선택</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{orderName || "마켓 구매"}</p>
            <p className="text-2xl font-black mt-1">
              {amount > 0 ? formatMoney(amount) : "—"}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {methods.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setSelectedId(pm.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                    selectedId === pm.id
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:bg-muted/40"
                  )}
                >
                  <CreditCard className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">
                      {pm.brand} •••• {pm.last4}
                      {pm.isDefault ? (
                        <span className="ml-2 text-[10px] font-bold text-primary">기본</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {String(pm.expMonth).padStart(2, "0")}/{String(pm.expYear).slice(-2)}
                    </p>
                  </div>
                </button>
              ))}

              <button
                type="button"
                onClick={() => void redirectCheckout()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/80 px-4 py-3 text-left hover:bg-muted/30"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-bold">새 카드로 결제</p>
                  <p className="text-xs text-muted-foreground">Stripe에서 카드 입력 · 저장 가능</p>
                </div>
              </button>
            </div>
          )}

          {methods.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center">
              저장된 카드가 없습니다. 새 카드로 결제하거나 지갑에서 카드를 등록하세요.
            </p>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            {methods.length > 0 ? (
              <Button
                type="button"
                className="flex-1"
                disabled={pending || loading || !selectedId || !orderId}
                onClick={paySelected}
              >
                {pending ? "결제 중…" : "선택한 카드로 결제"}
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1"
                disabled={pending || loading || !orderId}
                onClick={() => void redirectCheckout()}
              >
                새 카드로 결제
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
