"use client";
import { createTranslator } from "@/lib/i18n/messages";
const i18n = createTranslator("en");


import { useCallback, useState, useTransition } from "react";
import type { AdultVerificationScope } from "@prisma/client";
import { getAdultVerificationStatus } from "@/actions/adult-verification";
import { ADULT_VERIFICATION_REQUIRED_MSG } from "@/lib/adult-verification/constants";
import { requestPortOneIdentityVerification } from "@/components/adult-verification/portone-identity-sdk";

export function useAdultVerificationGate(defaultScope: AdultVerificationScope = "GLOBAL") {
  const [promptOpen, setPromptOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const status = await getAdultVerificationStatus();
    setIsAdult(status.isAdult);
    return status.isAdult;
  }, []);

  const ensureAdult = useCallback(async () => {
    const ok = isAdult ?? (await refresh());
    if (ok) return true;
    setError("");
    setPromptOpen(true);
    return false;
  }, [isAdult, refresh]);

  const runPortOneVerification = useCallback(async () => {
    setError("");
    await requestPortOneIdentityVerification(defaultScope);
    setIsAdult(true);
    setPromptOpen(false);
    return true;
  }, [defaultScope]);

  const verifyNow = useCallback(
    (onSuccess?: () => void) => {
      startTransition(async () => {
        try {
          await runPortOneVerification();
          onSuccess?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : i18n("payments.sd3f0vg"));
        }
      });
    },
    [runPortOneVerification]
  );

  return {
    promptOpen,
    setPromptOpen,
    pending,
    isAdult,
    error,
    ensureAdult,
    verifyNow,
    runPortOneVerification,
    message: ADULT_VERIFICATION_REQUIRED_MSG,
  };
}
