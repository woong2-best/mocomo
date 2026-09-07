"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Gem, Loader2 } from "lucide-react";
import type { PaymentIntentType } from "@prisma/client";
import { payWithGems } from "@/actions/checkout-payment";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatGemDisplay } from "@/lib/gems/display";

type Props = {
  type: PaymentIntentType;
  amountUsdCents: number;
  metadata: Record<string, unknown>;
  gemBalance: number;
  gemsRequired: number;
  amountLabel: string;
  disabled?: boolean;
  onSuccess?: (result: { type: string; redirectPath?: string }) => void;
  onError?: (message: string) => void;
};

export function GemPayOption({
  type,
  amountUsdCents,
  metadata,
  gemBalance,
  gemsRequired,
  amountLabel,
  disabled,
  onSuccess,
  onError,
}: Props) {
  const [pending, startTransition] = useTransition();
  const canPay = gemsRequired > 0 && gemBalance >= gemsRequired;

  function handlePay() {
    if (!canPay) return;
    startTransition(async () => {
      const res = await payWithGems({ type, amount: amountUsdCents, metadata });
      if ("error" in res && res.error) {
        onError?.(res.error);
        return;
      }
      if ("success" in res && res.success) {
        onSuccess?.({ type: res.type ?? type, redirectPath: res.redirectPath });
      }
    });
  }

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 space-y-2 transition-colors",
        canPay ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20"
      )}
    >
      <div className="flex items-center gap-2">
        <Gem className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">젬 잔액으로 결제</p>
          <p className="text-xs text-muted-foreground">
            보유 {formatGemDisplay(gemBalance)} · 필요 {formatGemDisplay(gemsRequired)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{amountLabel} · 카드 없이 즉시 결제</p>
      <Button
        type="button"
        variant="secondary"
        className="w-full bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/30"
        disabled={disabled || pending || !canPay}
        onClick={handlePay}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            젬 결제 중…
          </>
        ) : canPay ? (
          `${formatGemDisplay(gemsRequired)}로 결제`
        ) : (
          "젬 잔액 부족"
        )}
      </Button>
      {!canPay ? (
        <p className="text-[11px] text-center">
          <Link href="/wallet" className="text-primary font-semibold underline">
            지갑에서 젬 충전
          </Link>
        </p>
      ) : null}
    </div>
  );
}
