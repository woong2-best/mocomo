"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  stripeOnboardingCompleted: boolean;
  className?: string;
};

export function WalletStripeConnectPanel({ stripeOnboardingCompleted, className }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"onboard" | "dashboard" | null>(null);
  const [error, setError] = useState("");

  async function startOnboarding() {
    setLoading("onboard");
    setError("");
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/wallet?tab=earnings" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Stripe 연결에 실패했습니다.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Stripe 연결에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function openDashboard() {
    setLoading("dashboard");
    setError("");
    try {
      const res = await fetch("/api/stripe/connect/dashboard");
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Stripe 대시보드를 열 수 없습니다.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Stripe 대시보드를 열 수 없습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <p className="font-bold">수익 정산 계좌 연동</p>
      </div>

      {stripeOnboardingCompleted ? (
        <>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              ✓ Stripe 정산 계좌 연동 완료
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-1">
              수익은 Stripe Connect를 통해 등록한 계좌로 정산됩니다.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading === "dashboard"}
            onClick={() => void openDashboard()}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {loading === "dashboard" ? "열기 중…" : "정산 계좌/내역 관리"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Stripe Connect Express로 본인 확인 및 정산 계좌를 등록합니다. 한국·해외 은행 계좌를
            Stripe에서 직접 설정할 수 있습니다.
          </p>
          <Button
            type="button"
            className="w-full"
            disabled={loading === "onboard"}
            onClick={() => void startOnboarding()}
          >
            {loading === "onboard" ? "연결 중…" : "Stripe 정산 계좌 연결하기"}
          </Button>
        </>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => router.refresh()}
      >
        상태 새로고침
      </button>
    </div>
  );
}
