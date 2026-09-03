"use client";

import { useTransition } from "react";
import { Coins, Loader2 } from "lucide-react";
import { payWithMoco } from "@/actions/checkout-payment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMocoDisplay } from "@/lib/moco-display";

type Props = {
  orderId: string | null;
  mocoBalance: number;
  mocoRequired: number;
  amountLabel: string;
  disabled?: boolean;
  purchaseTermsAccepted?: boolean;
  onSuccess?: (result: { type: string; redirectPath?: string }) => void;
  onError?: (message: string) => void;
};

export function MocoPayOption({
  orderId,
  mocoBalance,
  mocoRequired,
  amountLabel,
  disabled,
  purchaseTermsAccepted,
  onSuccess,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const canPay = mocoRequired > 0 && mocoBalance >= mocoRequired && !!orderId;

  function handlePay() {
    if (!orderId || !canPay) return;
    if (!purchaseTermsAccepted) {
      onError?.("결제 전 이용약관에 동의해 주세요.");
      return;
    }
    startTransition(async () => {
      const res = await payWithMoco(orderId, true);
      if ("error" in res && res.error) {
        onError?.(res.error);
        return;
      }
      if ("success" in res && res.success) {
        onSuccess?.({ type: res.type, redirectPath: res.redirectPath });
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 space-y-2 transition-colors",
        canPay ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-muted/20"
      )}
    >
      <div className="flex items-center gap-2">
        <Coins className="h-5 w-5 text-amber-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">MOCO 잔액으로 결제</p>
          <p className="text-xs text-muted-foreground">
            보유 {formatMocoDisplay(mocoBalance)} · 필요 {formatMocoDisplay(mocoRequired)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{amountLabel} 상당 · 카드 없이 즉시 결제</p>
      <Button
        type="button"
        variant="secondary"
        className="w-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-100 border border-amber-500/30"
        disabled={disabled || pending || !canPay}
        onClick={handlePay}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            MOCO 결제 중…
          </>
        ) : canPay ? (
          `${formatMocoDisplay(mocoRequired)}로 결제`
        ) : (
          "MOCO 잔액 부족"
        )}
      </Button>
    </div>
  );
}
