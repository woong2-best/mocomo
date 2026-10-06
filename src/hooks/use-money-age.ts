"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { moneyAgeBlockMessage, type MoneyAgeReason } from "@/lib/money-age-policy";

export type PublicMoneyAge = {
  allowed: boolean;
  reason: MoneyAgeReason | null;
  hasBirthDate: boolean;
  minAge: number;
};

const PROFILE_BIRTH_DATE_PATH = "/settings/profile";

export function useMoneyAgeStatus() {
  const session = useSession();
  const [status, setStatus] = useState<PublicMoneyAge | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (session.status !== "authenticated") {
      setStatus(null);
      setReady(session.status !== "loading");
      return null;
    }
    try {
      const res = await fetch("/api/me/money-age", { credentials: "same-origin" });
      if (!res.ok) {
        setStatus(null);
        setReady(true);
        return null;
      }
      const data = (await res.json()) as PublicMoneyAge;
      setStatus(data);
      setReady(true);
      return data;
    } catch {
      setStatus(null);
      setReady(true);
      return null;
    }
  }, [session.status]);

  useEffect(() => {
    void refresh();
    const onRefresh = () => {
      void refresh();
    };
    window.addEventListener("mocomo-money-age-refresh", onRefresh);
    return () => window.removeEventListener("mocomo-money-age-refresh", onRefresh);
  }, [refresh]);

  const blocked = Boolean(status && !status.allowed);
  return {
    ready,
    blocked,
    allowed: status ? status.allowed : true,
    reason: status?.reason ?? null,
    hasBirthDate: Boolean(status?.hasBirthDate),
    message: blocked ? moneyAgeBlockMessage(status?.reason ?? "missing") : null,
    refresh,
  };
}

export function useMoneyAgeGate() {
  const router = useRouter();
  const pathname = usePathname();
  const moneyAge = useMoneyAgeStatus();

  const ensureMoneyAge = useCallback(async () => {
    const latest = (await moneyAge.refresh()) ?? {
      allowed: moneyAge.allowed,
      reason: moneyAge.reason,
    };
    if (latest.allowed) return true;
    const dest =
      latest.reason === "missing"
        ? `${PROFILE_BIRTH_DATE_PATH}?from=${encodeURIComponent(pathname ?? "/")}`
        : PROFILE_BIRTH_DATE_PATH;
    router.push(dest);
    return false;
  }, [moneyAge, pathname, router]);

  return { ...moneyAge, ensureMoneyAge };
}
