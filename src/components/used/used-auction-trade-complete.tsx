"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUsedAuctionTrade } from "@/actions/used-market";
import { Button } from "@/components/ui/button";

export function UsedAuctionTradeComplete({
  listingId,
  isSeller,
  isWinningBidder,
  sellerConfirmed,
  buyerConfirmed,
  hasMeetPin,
  sold,
}: {
  listingId: string;
  isSeller: boolean;
  isWinningBidder: boolean;
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
  hasMeetPin: boolean;
  sold: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mineConfirmed = isSeller ? sellerConfirmed : isWinningBidder ? buyerConfirmed : false;

  if (sold || (!isSeller && !isWinningBidder)) return null;

  if (hasMeetPin) {
    return (
      <section className="rounded-xl border border-border/70 bg-muted/20 p-3">
        <p className="text-sm font-semibold leading-5 text-foreground">
          {t("used.sy4pxx9")}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-sm font-semibold leading-5 text-foreground">
        {t("used.2_moco")}
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        type="button"
        className="h-11 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90"
        disabled={busy || mineConfirmed}
        onClick={async () => {
          setError("");
          setBusy(true);
          const res = await confirmUsedAuctionTrade(listingId);
          setBusy(false);
          if ("error" in res && res.error) {
            setError(errorText(res.error));
            return;
          }
          router.refresh();
        }}
      >
        {mineConfirmed ? t("used.sx3okvr") : busy ? t("post.menu.blockReportSubmitting") : t("used.s1m4rdhc")}
      </Button>
    </section>
  );
}
