"use client";

import { useState, useTransition } from "react";
import { ExternalLink, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REWARD_TERMS_LABEL } from "@/lib/settlement-moco/constants";
import { openStripeConnectOnboardingUrl } from "@/lib/marketplace/open-stripe-connect-url";

type Props = {
  registered: boolean;
  payoutsEnabled: boolean;
  hasConnectAccount: boolean;
  profile: {
    countryCode: string;
    legalName: string;
    accountNumberLast4: string;
    accountHolderName: string;
    bankCode: string | null;
    taxFormType: string;
  } | null;
  requestCardPayments?: boolean;
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
  profile,
  requestCardPayments = false,
  className,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function openOnboarding() {
    setError("");
    startTransition(async () => {
      try {
        const url = await postSettlementJson("/api/settlements/connect-account", {
          requestCardPayments,
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

  const linked = hasConnectAccount || registered;

  if (linked && payoutsEnabled && profile) {
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
          </p>
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={openDashboard}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Stripe 열기…
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              연동 완료 · 계좌 정보 수정하기
            </>
          )}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
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
        Stripe의 안전한 글로벌 정산망을 통해 본인 명의의 현지 은행 계좌를 연동합니다. 월말에{" "}
        {REWARD_TERMS_LABEL}가 등록 계좌로 자동 입금됩니다.
      </p>

      {linked && !payoutsEnabled ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          Stripe 온보딩이 아직 완료되지 않았습니다. 아래 버튼으로 이어서 진행해 주세요.
        </div>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={linked ? openDashboard : openOnboarding}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Stripe 연결 중…
          </>
        ) : linked ? (
          <>
            <ExternalLink className="h-4 w-4 mr-2" />
            연동 완료 · 계좌 정보 수정하기
          </>
        ) : (
          "Stripe 정산 계좌 연동하기"
        )}
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Stripe Express 온보딩 페이지에서 본인 확인 및 계좌 정보를 입력합니다. 완료 후 이 페이지로
        돌아옵니다.
      </p>
    </div>
  );
}
