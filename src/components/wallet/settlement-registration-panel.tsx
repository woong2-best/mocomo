"use client";

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
    throw new Error(data.error ?? "요청에 실패했습니다.");
  }
  if (!data.url) {
    throw new Error("Stripe URL을 받지 못했습니다.");
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
        setError(e instanceof Error ? e.message : "연동을 시작할 수 없습니다.");
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
        setError(e instanceof Error ? e.message : "대시보드를 열 수 없습니다.");
      }
    });
  }

  const linked = (hasConnectAccount || registered) && !needsExpressMigration;
  const onboardingFinished = (detailsSubmitted ?? payoutsEnabled) && !needsExpressMigration;

  function connectButtonLabel() {
    if (needsExpressMigration) return "Express로 다시 연동하기";
    if (!linked) return "Stripe Express 정산 계좌 연동하기";
    if (!onboardingFinished) return "Stripe 온보딩 이어서 진행하기";
    return "연동 완료 · 계좌 정보 수정하기";
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
          <p className="font-bold">Reward 정산 등록 완료</p>
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
            {taxReportingReady ? " · 세무 보고 준비 완료" : ""}
          </p>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-1">
            정산 수령 가능 · payouts_enabled
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={openConnect}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Stripe 열기…
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
          <li>해외 Stripe 지원 국가의 은행 계좌를 보유하고 계신 경우 정산 계좌 연동이 가능합니다.</li>
          <li>정산 계좌(Stripe)를 연동하셔야 팬들로부터 MOCO 후원을 수령할 수 있습니다.</li>
        </ul>
        <a
          href="https://stripe.com/global"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
        >
          Stripe 정산 지원 국가 및 계좌 조건 확인하기
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-4 space-y-4", className)}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="font-bold">Reward 정산 등록</p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        Stripe Express 온보딩에서 본인 확인·은행 계좌·세무 정보(W-9/W-8BEN)를 등록합니다. 월말에{" "}
        {REWARD_TERMS_LABEL}가 등록 계좌로 자동 입금됩니다.
      </p>
      <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc pl-4">
        <li>해외 Stripe 지원 국가의 은행 계좌를 보유하고 계신 경우 정산 계좌 연동이 가능합니다.</li>
        <li>정산 계좌(Stripe)를 연동하셔야 팬들로부터 MOCO 후원을 수령할 수 있습니다.</li>
      </ul>
      <a
        href="https://stripe.com/global"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
      >
        Stripe 정산 지원 국가 및 계좌 조건 확인하기
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <p className="text-xs font-semibold">
        정산 수령 상태:{" "}
        {payoutsEnabled ? (
          <span className="text-emerald-700 dark:text-emerald-400">가능 (payouts_enabled)</span>
        ) : (
          <span className="text-amber-700 dark:text-amber-300">불가 — Stripe 연동 미완료</span>
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
          이전 정산 계정 형식은 더 이상 지원되지 않습니다. 아래 버튼으로 Stripe Express 온보딩을
          다시 완료해 주세요.
        </div>
      ) : null}

      {taxRequirementsDue ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          세무 정보가 미비하여 Reward 지급이 보류될 수 있습니다. Stripe에서 W-9/W-8BEN 정보를
          완료해 주세요.
        </div>
      ) : null}

      {creatingAccount ? (
        <PayoutCountryField value={payoutCountry} onChange={setPayoutCountry} />
      ) : null}

      {linked && !onboardingFinished && !needsExpressMigration ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Stripe 온보딩이 아직 완료되지 않았습니다. 아래 버튼으로 이어서 진행해 주세요.
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
            Stripe 연결 중…
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
        Stripe Express 온보딩 페이지에서 본인 확인, 계좌, 세무 정보를 입력합니다. 완료 후 이
        페이지로 돌아옵니다. 연말 1099 등 세무 보고는 Stripe Connect Tax Reporting에 위임됩니다.
      </p>
    </div>
  );
}
