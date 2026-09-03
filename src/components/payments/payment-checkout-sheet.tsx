"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type { PaymentIntentType } from "@prisma/client";
import {
  confirmCheckoutPayment,
  createStripeCheckoutRedirect,
  payWithSavedCard,
  prepareCheckoutPayment,
} from "@/actions/checkout-payment";
import { startAddPaymentMethod } from "@/actions/payment-methods";
import { saveCheckoutForResume } from "@/components/payments/checkout-resume-handler";
import type { SavedPaymentMethod } from "@/lib/stripe-payment-methods";
import { PaymentLegalNotice } from "@/components/legal/legal-entity-notice";
import { PaidContentUsageNotice } from "@/components/payments/paid-content-usage-notice";
import { requiresPaidContentUsageNotice } from "@/lib/paid-content-usage-notice";
import { MocoPayOption } from "@/components/payments/moco-pay-option";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";
import { CreditCard, Loader2, Plus } from "lucide-react";
import { StripeOverseasPaymentNotice } from "@/components/payments/stripe-overseas-payment-notice";
import { PurchaseChargebackTermsNotice } from "@/components/payments/purchase-chargeback-terms-notice";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  showLegalNotice?: boolean;
  returnPath?: string;
  onSuccess?: (result: { type: string; redirectPath?: string }) => void;
};

function formatAmount(_type: PaymentIntentType, amount: number) {
  return formatUsd(amount);
}

export function PaymentCheckoutSheet({
  open,
  onOpenChange,
  type,
  amount,
  orderName,
  metadata,
  showLegalNotice,
  returnPath,
  onSuccess,
}: Props) {
  const pathname = usePathname();
  const resumePath = returnPath ?? pathname ?? "/";
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [mocoBalance, setMocoBalance] = useState(0);
  const [mocoRequired, setMocoRequired] = useState(0);
  const [purchaseTermsAccepted, setPurchaseTermsAccepted] = useState(false);

  const amountLabel = useMemo(() => formatAmount(type, amount), [amount, type]);

  useEffect(() => {
    if (!open) return;
    setPurchaseTermsAccepted(false);
    setError("");
    setLoading(true);
    void prepareCheckoutPayment({ type, amount, orderName, metadata })
      .then((res) => {
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        if (!("orderId" in res) || !res.orderId) return;
        setOrderId(res.orderId);
        setMethods(res.methods);
        const defaultPm = res.methods.find((m: SavedPaymentMethod) => m.isDefault) ?? res.methods[0];
        setSelectedId(defaultPm?.id ?? null);
        if (res.publishableKey) {
          setStripePromise(loadStripe(res.publishableKey));
        }
        setMocoBalance("mocoBalance" in res ? (res.mocoBalance ?? 0) : 0);
        setMocoRequired("mocoRequired" in res ? (res.mocoRequired ?? 0) : 0);
      })
      .finally(() => setLoading(false));
  }, [open, type, amount, orderName, metadata]);

  const handle3ds = useCallback(
    async (secret: string, oid: string) => {
      if (!stripePromise) return;
      const stripe = await stripePromise;
      if (!stripe) {
        setError("Stripe를 불러오지 못했습니다.");
        return;
      }
      const returnUrl = stripePaymentIntentReturnUrlClient(oid, resumePath);
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(secret, {
        return_url: returnUrl,
      });
      if (confirmError) {
        setError(confirmError.message ?? "인증에 실패했습니다.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setError("결제가 완료되지 않았습니다.");
        return;
      }
      const done = await confirmCheckoutPayment(oid);
      if ("error" in done && done.error) {
        setError(done.error);
        return;
      }
      if ("success" in done && done.success) {
        onOpenChange(false);
        onSuccess?.({ type: done.type, redirectPath: done.redirectPath });
      }
    },
    [onOpenChange, onSuccess, resumePath, stripePromise]
  );

  function paySelected() {
    if (!orderId || !selectedId) {
      setError("카드를 선택해 주세요.");
      return;
    }
    if (!purchaseTermsAccepted) {
      setError("결제 전 이용약관에 동의해 주세요.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await payWithSavedCard(orderId, selectedId, true);
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
        onSuccess?.({ type: res.type, redirectPath: res.redirectPath });
      }
    });
  }

  async function redirectCheckout() {
    if (!purchaseTermsAccepted) {
      setError("결제 전 이용약관에 동의해 주세요.");
      return;
    }
    setError("");
    const res = await createStripeCheckoutRedirect({
      type,
      amount,
      orderName,
      metadata,
      purchaseTermsAccepted: true,
    });
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("checkoutUrl" in res && res.checkoutUrl) window.location.href = res.checkoutUrl;
  }

  async function addCardFromWallet() {
    setError("");
    saveCheckoutForResume({ type, amount, orderName, metadata, returnPath: resumePath });
    const res = await startAddPaymentMethod(resumePath);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("checkoutUrl" in res && res.checkoutUrl) window.location.href = res.checkoutUrl;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>결제 수단 선택</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{orderName}</p>
            <p className="text-2xl font-black mt-1">{amountLabel}</p>
          </div>

          {/* Sits above every pay affordance so no purchase can be completed
              without the personal-viewing-licence terms on screen. */}
          {requiresPaidContentUsageNotice(type) ? <PaidContentUsageNotice /> : null}

          <PurchaseChargebackTermsNotice
            checked={purchaseTermsAccepted}
            onCheckedChange={setPurchaseTermsAccepted}
          />

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {type !== "MOCO_TOPUP" ? (
                <MocoPayOption
                  orderId={orderId}
                  mocoBalance={mocoBalance}
                  mocoRequired={mocoRequired}
                  amountLabel={amountLabel}
                  disabled={loading || pending || !purchaseTermsAccepted}
                  purchaseTermsAccepted={purchaseTermsAccepted}
                  onError={setError}
                  onSuccess={(result) => {
                    onOpenChange(false);
                    onSuccess?.(result);
                  }}
                />
              ) : null}

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
                onClick={() => void addCardFromWallet()}
                className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border/80 px-4 py-3 text-left hover:bg-muted/30"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-bold">지갑에 카드 추가</p>
                  <p className="text-xs text-muted-foreground">카드 등록 후 이 화면으로 돌아와 결제할 수 있습니다</p>
                </div>
              </button>

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
            </div>
          )}

          {methods.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center">
              저장된 카드가 없습니다. 지갑에서 카드를 추가하거나 새 카드로 결제하세요.
            </p>
          ) : null}

          {showLegalNotice ? <PaymentLegalNotice compact /> : null}
          <StripeOverseasPaymentNotice />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            {methods.length > 0 ? (
              <Button
                type="button"
                className="flex-1"
                disabled={pending || loading || !selectedId || !orderId || !purchaseTermsAccepted}
                onClick={paySelected}
              >
                {pending ? "결제 중…" : "선택한 카드로 결제"}
              </Button>
            ) : (
              <Button type="button" className="flex-1" disabled={pending || loading || !purchaseTermsAccepted} onClick={() => void redirectCheckout()}>
                새 카드로 결제
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
