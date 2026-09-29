"use client";

import { useEffect, useState } from "react";
import { pushErrorToast } from "@/lib/published-toast-store";
import {
  CREATOR_PAYOUT_BLOCKED_TOAST_KO,
  STRIPE_ACCOUNT_NOT_READY,
} from "@/lib/creator-payout-ready";

/** null = 아직 모름. false면 후원 버튼 비활성. */
export function useCreatorPayoutReady(targetId: string | null | undefined) {
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const id = targetId?.trim();
    if (!id) {
      setPayoutsEnabled(null);
      return;
    }
    let cancel = false;
    fetch(`/api/creators/payout-ready?target=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { payoutsEnabled?: boolean };
      })
      .then((data) => {
        if (cancel || !data) return;
        setPayoutsEnabled(data.payoutsEnabled === true);
      })
      .catch(() => {
        if (!cancel) setPayoutsEnabled(null);
      });
    return () => {
      cancel = true;
    };
  }, [targetId]);

  return payoutsEnabled;
}

export function toastIfStripeAccountNotReady(body: { code?: string } | null | undefined): boolean {
  if (body?.code !== STRIPE_ACCOUNT_NOT_READY) return false;
  pushErrorToast({ message: CREATOR_PAYOUT_BLOCKED_TOAST_KO });
  return true;
}
