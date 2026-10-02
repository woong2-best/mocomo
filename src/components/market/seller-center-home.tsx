"use client";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { errorText } from "@/lib/i18n/error-text";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MARKET_BRAND_FULL, MARKET_BRAND_NAME } from "@/lib/market-brand";
import { MarketplaceSellerApplyForm } from "@/components/market/marketplace-seller-apply-form";
import { SellerSettlementInvoices } from "@/components/market/seller-settlement-invoices";
import type { SellerSettlementInvoiceRow } from "@/actions/marketplace-settlement-invoices";
import { resumeSellerConnectFromOnboarding } from "@/actions/marketplace-seller-onboarding";
import { openStripeConnectOnboardingUrl } from "@/lib/marketplace/open-stripe-connect-url";
import { DEFAULT_EXPRESS_PAYOUT_COUNTRY } from "@/lib/marketplace/stripe-supported-countries";
import { PayoutCountryField } from "@/components/wallet/payout-country-field";

export type SellerPrepState = {
  sellerInfoDone: boolean;
  firstProductDone: boolean;
  displayName: string;
  sellerTypeLabel: string;
  connectReady: boolean;
  connectMessage: string;
  listingsCount: number;
  welcome?: boolean;
  status: string;
  canList: boolean;
  stripeRequirementsDue?: boolean;
  stripeDisabled?: boolean;
};

export function SellerCenterHome({
  prep,
  profileFormName,
  settlementInvoices = [],
}: {
  prep: SellerPrepState;
  profileFormName: string;
  settlementInvoices?: SellerSettlementInvoiceRow[];
}) {
  const doneCount = (prep.sellerInfoDone ? 1 : 0) + (prep.firstProductDone ? 1 : 0);
  const total = 2;
  const progressPct = (doneCount / total) * 100;
  const showPrep = doneCount < total || prep.welcome;
  const [stripePending, startStripe] = useTransition();
  const [payoutCountry, setPayoutCountry] = useState(DEFAULT_EXPRESS_PAYOUT_COUNTRY);
  const [stripeError, setStripeError] = useState("");

  function resumeStripe() {
    setStripeError("");
    startStripe(async () => {
      const res = await resumeSellerConnectFromOnboarding({ payoutCountry });
      if ("error" in res && res.error) {
        setStripeError(errorText(res.error));
        return;
      }
      if ("url" in res && res.url) openStripeConnectOnboardingUrl(res.url, false);
    });
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {(!prep.connectReady || prep.stripeRequirementsDue || prep.stripeDisabled) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
          <p className="font-semibold">{t("market.stripe_5")}</p>
          <p>{prep.connectMessage}</p>
          <PayoutCountryField value={payoutCountry} onChange={setPayoutCountry} id="seller-payout-country" />
          <Button type="button" size="sm" disabled={stripePending} onClick={resumeStripe}>
            {t("seller.stripeResume")}
          </Button>
          {stripeError ? <p className="text-sm text-destructive">{stripeError}</p> : null}
        </div>
      )}

      {prep.welcome && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            prep.status === "APPROVED"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          )}
        >
          {prep.status === "APPROVED" ? (
            <>{t("market.stripe_6")}</>
          ) : (
            <>{t("market.stripe_7")}</>
          )}
        </div>
      )}

      {prep.status === "PENDING" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">{t("market.stg3ooy")}</p>
          <p className="mt-1 text-amber-800/90">
            {t("market.stripe_8")}
          </p>
        </div>
      )}

      {prep.status === "REJECTED" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("market.s1vr1z4b")}
        </div>
      )}

      {showPrep && (
        <section className="rounded-2xl border border-[#d8e0ef] bg-white p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary text-xl font-black">
              M
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {t("market.sellerHomeHero", { brand: MARKET_BRAND_FULL })}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {t("market.s1sowfve")}
              </p>
            </div>
            <div className="sm:w-44 shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium">{t("market.s1aaq67c")}</span>
                <span className="text-muted-foreground">
                  {doneCount}/{total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <PrepCard
              done={prep.sellerInfoDone}
              title={t("market.s2xwf91")}
              description={t("market.stripe_9")}
              actions={
                <Button asChild className="min-w-[9.5rem]">
                  <Link href="#profile">{t("market.se9nrtp")}</Link>
                </Button>
              }
            />

            <PrepCard
              done={prep.firstProductDone}
              title={t("market.srohkv4")}
              description={t("market.sd71n2h")}
              actions={
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  {prep.canList && prep.status === "APPROVED" ? (
                    <Button asChild className="min-w-[9.5rem]">
                      <Link href="/market/sell-item">{t("market.s10ec6sl")}</Link>
                    </Button>
                  ) : (
                    <Button type="button" className="min-w-[9.5rem]" disabled>
                      {t("market.sduknow")}
                    </Button>
                  )}
                  <Button asChild variant="outline" className="min-w-[9.5rem] border-primary/40 text-primary">
                    <Link href="/market">
                      {t("market.browseOnBrand", { brand: MARKET_BRAND_NAME })}
                    </Link>
                  </Button>
                </div>
              }
            />
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-bold">{t("market.sgp3k9y")}</h2>
          <span className="text-xs text-muted-foreground">1/1</span>
        </div>
        <div className="grid sm:grid-cols-[140px_1fr] gap-4 items-center">
          <div className="h-28 rounded-xl bg-gradient-to-br from-primary/15 via-amber-50 to-sky-50 border border-border/40" />
          <div>
            <p className="font-semibold">{t("market.s1tq4890")}</p>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {t("market.sellerCenterBlurb", { brand: MARKET_BRAND_FULL })}
            </p>
            <Link
              href="/legal/seller-terms"
              className="inline-block mt-3 text-sm text-primary font-medium hover:underline"
            >
              {t("market.sa6vfj4")}
            </Link>
          </div>
        </div>
      </section>

      <section
        id="profile"
        className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm scroll-mt-20"
      >
        <h2 className="text-base font-bold mb-1">{t("market.s1c5axcx")}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {prep.sellerTypeLabel} · {prep.connectMessage}
          {prep.listingsCount > 0 ? t("market.s17xvob2", { v0: prep.listingsCount }) : ""}
        </p>
        <MarketplaceSellerApplyForm
          initialName={profileFormName}
          connectReady={prep.connectReady}
        />
      </section>

      <section
        id="settlement"
        className="rounded-2xl border border-border/60 bg-white p-5 sm:p-6 shadow-sm scroll-mt-20"
      >
        <h2 className="text-base font-bold mb-1">{t("market.invoice")}</h2>
        <p className="text-xs text-muted-foreground mb-4">
          {t("market.stripe_connect_10")}
        </p>
        <SellerSettlementInvoices invoices={settlementInvoices} />
      </section>
    </div>
  );
}

function PrepCard({
  done,
  title,
  description,
  actions,
}: {
  done: boolean;
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border px-4 py-4 sm:px-5",
        done ? "border-emerald-200 bg-emerald-50/40" : "border-[#c9d7f5] bg-[#f7f9ff]"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-muted-foreground/30 text-muted-foreground/40"
        )}
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] sm:text-base">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed flex items-start gap-1">
          <span>{description}</span>
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-50" />
        </p>
      </div>
      {!done && <div className="sm:ml-auto shrink-0">{actions}</div>}
      {done && (
        <span className="sm:ml-auto text-sm font-medium text-emerald-700 shrink-0">{t("common.done")}</span>
      )}
    </div>
  );
}
