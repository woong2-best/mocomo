"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      setError(e instanceof Error ? e.message : t("used.sd3f0vg"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex gap-3">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0" />
        <div className="text-sm space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-200">{t("used.sgmnqcf")}</p>
          <p className="text-muted-foreground leading-relaxed">
            {restrictedLabel
              ? t("used.s19u613u", { v0: restrictedLabel })
              : t("used.s1xa36bf")}
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
        {loading || adultGate.pending ? t("used.s19jsxmd") : t("used.s6vrjis")}
      </Button>

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
