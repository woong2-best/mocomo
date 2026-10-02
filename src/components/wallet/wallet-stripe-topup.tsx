"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createGemTopupCheckout } from "@/actions/gems";
import {
  MOCO_PURCHASE_PG_FEE_NOTE,
  MOCO_PURCHASE_TERMS_COPY,
  parseMocoTopupCount,
  quoteGemTopup,
  sanitizeMocoTopupInput,
} from "@/lib/gems/constants";
import { formatMocoDisplay } from "@/lib/gems/display";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  purchasedMoco: number;
  minTopupMoco: number;
  lowBalanceNotice?: boolean;
};

function formatUsdCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function WalletStripeTopup({ purchasedMoco, minTopupMoco, lowBalanceNotice }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [amount, setAmount] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const parsed = parseMocoTopupCount(amount);
  const quote = useMemo(
    () => (parsed != null && parsed >= minTopupMoco ? quoteGemTopup(parsed) : null),
    [minTopupMoco, parsed]
  );
  const fee = quote && quote.ok ? quote : null;

  function pay() {
    if (!termsAccepted) {
      setError(t("wallet.stripe.acceptTerms"));
      return;
    }
    const moco = parseMocoTopupCount(amount);
    if (moco == null || moco < minTopupMoco) {
      setError(t("wallet.stripe.minAmount", { min: String(minTopupMoco) }));
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await createGemTopupCheckout(moco, true);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("checkoutUrl" in res && res.checkoutUrl) {
        window.location.assign(res.checkoutUrl);
        return;
      }
      setError(t("wallet.stripe.checkoutOpenFailed"));
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4">
      <div>
        <p className="text-sm text-muted-foreground">{t("wallet.stripe.ownedMoco")}</p>
        <p className="text-3xl font-black tabular-nums">{formatMocoDisplay(purchasedMoco)}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("wallet.stripe.ownedMocoDesc")}
        </p>
      </div>

      {lowBalanceNotice ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold">
          {t("wallet.stripe.lowBalancePrompt")}
        </p>
      ) : null}

      <label className="block space-y-1.5">
        <span className="text-sm font-bold">{t("wallet.stripe.amountLabel")}</span>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={amount}
          disabled={pending}
          onChange={(e) => {
            setAmount(sanitizeMocoTopupInput(e.target.value).replace(/^0+(?=\d)/, ""));
            if (error) setError("");
          }}
          placeholder={`${minTopupMoco}`}
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-2xl font-black tabular-nums outline-none focus:border-primary"
        />
      </label>

      {fee ? (
        <dl className="space-y-1 rounded-xl bg-muted/40 px-3 py-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("wallet.stripe.productPrice")}</dt>
            <dd className="font-mono tabular-nums">{formatUsdCents(fee.basePriceCents)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{t("wallet.stripe.processingFee")}</dt>
            <dd className="font-mono tabular-nums">+{formatUsdCents(fee.pgFeeCents)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-border/60 pt-1 font-bold">
            <dt>{t("wallet.stripe.stripeTotal")}</dt>
            <dd className="font-mono tabular-nums">{formatUsdCents(fee.usdCents)}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("wallet.stripe.unitHint", { min: String(minTopupMoco) })}
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>{MOCO_PURCHASE_TERMS_COPY}</span>
      </label>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{MOCO_PURCHASE_PG_FEE_NOTE}</p>
      <p className="text-[11px]">
        <a href="/contribution-tower" className="font-bold text-[#1B3A6B] underline dark:text-primary">
          {t("wallet.viewContributionTower")}
        </a>
      </p>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={pay}
        disabled={pending || !fee || !termsAccepted}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#635bff] px-4 py-3 text-sm font-black text-white disabled:opacity-45"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("wallet.stripe.payWithStripe")}
      </button>
    </section>
  );
}
