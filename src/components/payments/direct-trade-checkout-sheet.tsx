"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useState, useTransition } from "react";
import type { MarketplaceCheckoutInput } from "@/actions/marketplace-checkout";
import type { DirectTradeSnapshot } from "@/lib/marketplace/payment-routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/money";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkoutInput: MarketplaceCheckoutInput | null;
  onSuccess?: (result: { marketplaceOrderId: string }) => void;
};

export function DirectTradeCheckoutSheet({
  open,
  onOpenChange,
  checkoutInput,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [confirming, startConfirm] = useTransition();
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<DirectTradeSnapshot | null>(null);
  const [paid, setPaid] = useState(false);

  const createOrder = useCallback(async () => {
    if (!checkoutInput) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/market/direct-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checkoutInput }),
      });
      const data = (await res.json()) as
        | { error?: string; marketplaceOrderId?: string; directTradeSnapshot?: DirectTradeSnapshot }
        | DirectTradeSnapshot;
      if (!res.ok) {
        setError(("error" in data && data.error) || t("payments.s1gtbt7"));
        return;
      }
      const payload = data as {
        marketplaceOrderId: string;
        directTradeSnapshot: DirectTradeSnapshot;
      };
      setOrderId(payload.marketplaceOrderId);
      setSnapshot(payload.directTradeSnapshot);
    } catch {
      setError(t("profile.s18n7wbo"));
    } finally {
      setLoading(false);
    }
  }, [checkoutInput]);

  useEffect(() => {
    if (!open || !checkoutInput) return;
    setPaid(false);
    setOrderId(null);
    setSnapshot(null);
    void createOrder();
  }, [open, checkoutInput, createOrder]);

  function confirmPaid() {
    if (!orderId) return;
    setError("");
    startConfirm(async () => {
      const res = await fetch("/api/market/direct-checkout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplaceOrderId: orderId, action: "confirm_paid" }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(errorText(data.error ?? t("payments.soo10em")));
        return;
      }
      setPaid(true);
      onOpenChange(false);
      onSuccess?.({ marketplaceOrderId: orderId });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("payments.s1izxg7h")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : snapshot ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 leading-relaxed">
              {snapshot.notice}
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2 text-sm">
              <p className="font-semibold text-base">{snapshot.sellerDisplayName}</p>
              <Row label={t("lib.bank.verification.s27a36aee28")} value={snapshot.bankName} />
              <Row label={t("lib.apick.smmrdvc")} value={snapshot.accountNumber} mono />
              <Row label={t("payments.stux30")} value={snapshot.accountHolder} />
              {snapshot.contactPhone ? <Row label={t("payments.stw1wr")} value={snapshot.contactPhone} /> : null}
              <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                <span className="text-muted-foreground">{t("payments.s1wr00pe")}</span>
                <span className="text-xl font-black text-primary">
                  {formatPrice(snapshot.amount, snapshot.currency)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                플랫폼 수수료 0원 · 입금 확인은 판매자와 직접 진행해 주세요.
              </p>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={confirming || paid}
                onClick={confirmPaid}
              >
                {confirming ? t("post.menu.blockReportSubmitting") : t("payments.s1cpi727")}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-destructive py-4">{error || t("payments.svk7wqk")}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={mono ? "font-mono font-semibold text-right break-all" : "font-semibold text-right"}>
        {value}
      </span>
    </div>
  );
}
