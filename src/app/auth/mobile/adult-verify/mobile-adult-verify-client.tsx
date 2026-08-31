"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { AdultVerificationScope } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ADULT_VERIFICATION_REQUIRED_MSG } from "@/lib/adult-verification/constants";
import { requestPortOneIdentityVerification } from "@/components/adult-verification/portone-identity-sdk";

const APP_SUCCESS_URL = "mocomo://adult-verification/success";

type Props = {
  scope: AdultVerificationScope;
  alreadyVerified: boolean;
};

export function MobileAdultVerifyClient({ scope, alreadyVerified }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (alreadyVerified) {
      window.location.href = `${APP_SUCCESS_URL}?already=1`;
    }
  }, [alreadyVerified]);

  async function startVerification() {
    setBusy(true);
    setError("");
    try {
      await requestPortOneIdentityVerification(scope);
      window.location.href = APP_SUCCESS_URL;
    } catch (e) {
      setError(e instanceof Error ? e.message : "본인인증에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center gap-5 px-4 py-8">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-200">본인인증</p>
          <p className="text-muted-foreground leading-relaxed">{ADULT_VERIFICATION_REQUIRED_MSG}</p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="button"
        className="w-full rounded-full"
        disabled={busy}
        onClick={() => void startVerification()}
      >
        {busy ? "인증 진행 중…" : "휴대폰 본인인증 시작"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        인증이 완료되면 앱으로 자동 돌아갑니다.
      </p>
    </div>
  );
}
