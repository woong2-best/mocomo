"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { walletSettlementPath } from "@/lib/settlement-account";
import { ADULT_MIN_AGE } from "@/lib/adult-verification/constants";
import { useAdultVerificationGate } from "@/hooks/use-adult-verification-gate";
import { AdultVerificationDialog } from "@/components/adult-verification/adult-verification-dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export function UsedAdultVerifyForm({
  callbackUrl,
  restrictedLabel,
}: {
  callbackUrl: string;
  restrictedLabel?: string;
}) {
  const router = useRouter();
  const adultGate = useAdultVerificationGate("USED_MARKET");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startVerification() {
    setLoading(true);
    setError("");
    try {
      await adultGate.runPortOneVerification();
      router.push(callbackUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-200">청소년 보호</p>
          <p className="text-muted-foreground leading-relaxed">
            {restrictedLabel
              ? `「${restrictedLabel}」 상품은 `
              : "술·담배·성인용품·유료 거래는 "}
            만 {ADULT_MIN_AGE}세 이상만 이용할 수 있습니다. 휴대폰 본인인증으로 연령을 확인합니다.
          </p>
        </div>
      </div>

      {(error || adultGate.error) && (
        <p className="text-sm text-destructive">{error || adultGate.error}</p>
      )}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full rounded-xl"
        disabled={loading || adultGate.pending}
        onClick={() => void startVerification()}
      >
        {loading || adultGate.pending ? "인증 진행 중…" : "휴대폰 본인인증 시작"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        계좌 인증이 안 되어 있나요?{" "}
        <Link href={walletSettlementPath(callbackUrl)} className="underline">
          지갑에서 계좌 등록
        </Link>
      </p>

      <AdultVerificationDialog
        open={adultGate.promptOpen}
        onOpenChange={adultGate.setPromptOpen}
        onVerify={() => adultGate.verifyNow(() => router.push(callbackUrl))}
        busy={adultGate.pending}
        error={adultGate.error}
      />
    </div>
  );
}
