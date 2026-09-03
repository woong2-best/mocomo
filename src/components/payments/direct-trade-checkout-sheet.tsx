"use client";

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
        setError(("error" in data && data.error) || "주문을 만들 수 없습니다.");
        return;
      }
      const payload = data as {
        marketplaceOrderId: string;
        directTradeSnapshot: DirectTradeSnapshot;
      };
      setOrderId(payload.marketplaceOrderId);
      setSnapshot(payload.directTradeSnapshot);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
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
        setError(data.error ?? "확인에 실패했습니다.");
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
          <DialogTitle>무통장 직거래</DialogTitle>
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
              <Row label="은행" value={snapshot.bankName} />
              <Row label="계좌번호" value={snapshot.accountNumber} mono />
              <Row label="예금주" value={snapshot.accountHolder} />
              {snapshot.contactPhone ? <Row label="연락처" value={snapshot.contactPhone} /> : null}
              <div className="pt-2 border-t border-border/50 flex justify-between items-center">
                <span className="text-muted-foreground">송금 금액</span>
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
                {confirming ? "처리 중…" : "송금 완료 표시"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-destructive py-4">{error || "주문 정보를 불러올 수 없습니다."}</p>
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
