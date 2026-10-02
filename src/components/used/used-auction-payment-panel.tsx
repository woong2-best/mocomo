"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAuctionPaymentComplete } from "@/actions/used-auction-payment";
import { Button } from "@/components/ui/button";
import { UsedAuctionPaymentCountdown } from "@/components/used/used-auction-payment-countdown";
import { formatUsedPrice } from "@/lib/used-market";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function UsedAuctionPaymentPanel({
  listingId,
  paymentDueAt,
  amount,
  currency,
  isWinner,
  paymentCompleted,
  marketplaceOrderId,
}: {
  listingId: string;
  paymentDueAt: Date | string;
  amount: number;
  currency?: string | null;
  isWinner: boolean;
  paymentCompleted?: boolean;
  marketplaceOrderId?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (marketplaceOrderId) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 space-y-2">
        <p className="text-sm font-bold text-green-700 dark:text-green-400">{t("used.stripe")}</p>
        <p className="text-xs text-muted-foreground">
          {t("used.star_market_72h_capture")}
        </p>
        <Button asChild className="w-full rounded-xl">
          <Link href={`/market/orders/${marketplaceOrderId}`}>{t("used.s1xxt60e")}</Link>
        </Button>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex gap-2 items-start">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-700 dark:text-green-400">{t("used.smf0ymc")}</p>
          <p className="text-xs text-muted-foreground">{t("used.s17gjjt7")}</p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-orange-700 dark:text-orange-300">{t("used.s1dmbieq")}</p>
          <p className="text-lg font-black">{formatUsedPrice(amount, currency)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">{t("used.shl51sk")}</p>
          <UsedAuctionPaymentCountdown dueAt={paymentDueAt} className="text-base" />
        </div>
      </div>

      <div className="flex gap-2 items-start text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
        <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
        <p>
          {t("used.s1265ttq")} <strong className="text-foreground">{t("used.sysz17v")}</strong>
          {t("used.sp6pvs8")}
        </p>
      </div>

      {isWinner && (
        <>
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              const res = await markAuctionPaymentComplete(listingId);
              setBusy(false);
              if ("error" in res && res.error) setError(errorText(res.error));
              else if ("redirectPath" in res && res.redirectPath) router.push(res.redirectPath);
              else router.refresh();
            }}
          >
            {busy ? t("post.menu.blockReportSubmitting") : t("used.s1m07wx0")}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </section>
  );
}
