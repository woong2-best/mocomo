"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState, useTransition } from "react";
import { ExternalLink, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REWARD_TERMS_LABEL } from "@/lib/settlement-moco/constants";
import { openStripeConnectOnboardingUrl } from "@/lib/marketplace/open-stripe-connect-url";
import { DEFAULT_EXPRESS_PAYOUT_COUNTRY } from "@/lib/marketplace/stripe-supported-countries";
import { PayoutCountryField } from "@/components/wallet/payout-country-field";

type Props = {
  registered: boolean;
  payoutsEnabled: boolean;
  hasConnectAccount: boolean;
  needsExpressMigration?: boolean;
  taxReportingReady?: boolean;
  taxRequirementsDue?: boolean;
  profile: {
    countryCode: string;
    legalName: string;
    accountNumberLast4: string;
    accountHolderName: string;
    bankCode: string | null;
    taxFormType: string;
  } | null;
  requestCardPayments?: boolean;
  /** Stripe Account.details_submitted. 없으면 payoutsEnabled로 추정한다. */
  detailsSubmitted?: boolean;
  notReadyReasons?: { code: string; message: string }[];
  className?: string;
};

async function postSettlementJson(path: string, body?: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? t("wallet.s1e287y0"));
  }
  if (!data.url) {
    throw new Error(t("wallet.stripe_url"));
  }
  return data.url;
}

export function SettlementRegistrationPanel({
  registered,
  payoutsEnabled,
  hasConnectAccount,
  needsExpressMigration = false,
  taxReportingReady = false,
  taxRequirementsDue = false,
  profile,
  requestCardPayments = false,
  detailsSubmitted,
  notReadyReasons = [],
  className,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [payoutCountry, setPayoutCountry] = useState(DEFAULT_EXPRESS_PAYOUT_COUNTRY);
  const creatingAccount = !hasConnectAccount || needsExpressMigration;

  function openOnboarding() {
    setError("");
    startTransition(async () => {
      try {
        const url = await postSettlementJson("/api/settlements/connect-account", {
          requestCardPayments,
          ...(creatingAccount ? { payoutCountry } : {}),
        });
        openStripeConnectOnboardingUrl(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("wallet.s1tmd8n5"));
      }
    });
  }

  function openDashboard() {
    setError("");
    startTransition(async () => {
      try {
        const url = await postSettlementJson("/api/settlements/connect-dashboard");
        openStripeConnectOnboardingUrl(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("wallet.svrs2xz"));
      }
    });
  }

  const linked = (hasConnectAccount || registered) && !needsExpressMigration;
  const onboardingFinished = (detailsSubmitted ?? payoutsEnabled) && !needsExpressMigration;

  function connectButtonLabel() {
    if (needsExpressMigration) return t("wallet.express");
    if (!linked) return t("wallet.stripe_express_2");
    if (!onboardingFinished) return t("wallet.stripe_7");
    return t("wallet.s1dsqv8o");
  }

  function openConnect() {
    if (onboardingFinished) openDashboard();
    else openOnboarding();
  }

  if (linked && payoutsEnabled && profile && !taxRequirementsDue) {
    return (
      <div className={cn("rounded-2xl border border-border/60 bg-card p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="font-bold">{t("wallet.reward_2")}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">{profile.legalName}</p>
          {profile.accountNumberLast4 !== "0000" ? (
            <p className="text-emerald-800/80 dark:text-emerald-300/80 mt-1">
              ****{profile.accountNumberLast4} · {profile.accountHolderName}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground mt-2">
            월말에 정산 MOCO가 {REWARD_TERMS_LABEL}로 자동 지급됩니다.
            {taxReportingReady ? t("wallet.svmfeiz") : ""}
          </p>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
            {t("wallet.payouts_enabled")}
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={openConnect}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("wallet.stripe")}
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              {connectButtonLabel()}
            </>
          )}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <ul className="text-xs text-muted-foreground leading-relaxed space-y-1 list-disc pl-4">
          <li>{t("wallet.stripe_2")}</li>
          <li>{t("wallet.stripe_moco")}</li>
        </ul>
        <a
          href="https://stripe.com/global"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
        >
          {t("wallet.stripe_3")}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-4 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="font-bold">{t("wallet.reward_3")}</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Stripe Express 온보딩에서 본인 확인·은행 계좌·세무 정보(W-9/W-8BEN)를 등록합니다. 월말에{" "}
        {REWARD_TERMS_LABEL}가 등록 계좌로 자동 입금됩니다.
      </p>
      <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc pl-4">
        <li>{t("wallet.stripe_2")}</li>
        <li>{t("wallet.stripe_moco")}</li>
      </ul>
      <a
        href="https://stripe.com/global"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
      >
        {t("wallet.stripe_3")}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <p className="text-xs font-semibold">
        정산 수령 상태:{" "}
        {payoutsEnabled ? (
          <span className="text-emerald-700 dark:text-emerald-400">{t("wallet.payouts_enabled_2")}</span>
        ) : (
          <span className="text-amber-700 dark:text-amber-300">{t("wallet.stripe_4")}</span>
        )}
      </p>
      {!payoutsEnabled && notReadyReasons.length > 0 ? (
        <ul className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1 list-disc pl-4">
          {notReadyReasons.map((reason) => (
            <li key={reason.code}>{reason.message}</li>
          ))}
        </ul>
      ) : null}

      {needsExpressMigration ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {t("wallet.stripe_express")}
        </div>
      ) : null}

      {taxRequirementsDue ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {t("wallet.reward_stripe_w_9_w")}
        </div>
      ) : null}

      {creatingAccount ? (
        <PayoutCountryField value={payoutCountry} onChange={setPayoutCountry} />
      ) : null}

      {linked && !onboardingFinished && !needsExpressMigration ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {t("wallet.stripe_5")}
        </div>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={openConnect}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {t("wallet.stripe_6")}
          </>
        ) : onboardingFinished ? (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
            {connectButtonLabel()}
          </>
        ) : (
          connectButtonLabel()
        )}
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {t("wallet.stripe_express_1099_stripe_connect")}
      </p>
    </div>
  );
}
