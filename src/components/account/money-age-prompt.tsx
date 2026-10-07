"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AgeBlockedDialog, type AgeBlockedKind } from "@/components/account/age-blocked-dialog";
import type { MoneyAgeReason } from "@/lib/money-age-policy";

export type PublicMoneyAge = {
  allowed: boolean;
  reason: MoneyAgeReason | null;
  hasBirthDate: boolean;
};

type MoneyAgePromptApi = {
  ensureMoneyAge: () => Promise<boolean>;
  ensureNsfwView: () => Promise<boolean>;
};

const MoneyAgePromptContext = createContext<MoneyAgePromptApi | null>(null);

async function fetchMoneyAge(): Promise<PublicMoneyAge | null> {
  const res = await fetch("/api/me/money-age", { credentials: "same-origin" });
  if (!res.ok) return null;
  return (await res.json()) as PublicMoneyAge;
}

async function fetchNsfwAgeAllowed(): Promise<boolean> {
  const res = await fetch("/api/me/nsfw-age", { credentials: "same-origin" });
  if (!res.ok) return false;
  const data = (await res.json()) as { allowed?: boolean };
  return data.allowed === true;
}

export function MoneyAgePromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AgeBlockedKind>("money-missing");

  const ensureMoneyAge = useCallback(async () => {
    const latest = await fetchMoneyAge();
    if (!latest) return false;
    if (latest.allowed) return true;
    setKind(latest.reason === "underage" ? "money-underage" : "money-missing");
    setOpen(true);
    return false;
  }, []);

  const ensureNsfwView = useCallback(async () => {
    if (await fetchNsfwAgeAllowed()) return true;
    setKind("nsfw-view");
    setOpen(true);
    return false;
  }, []);

  const api = useMemo(
    () => ({ ensureMoneyAge, ensureNsfwView }),
    [ensureMoneyAge, ensureNsfwView]
  );

  return (
    <MoneyAgePromptContext.Provider value={api}>
      {children}
      <AgeBlockedDialog open={open} onOpenChange={setOpen} kind={kind} />
    </MoneyAgePromptContext.Provider>
  );
}

export function useMoneyAgePrompt() {
  const ctx = useContext(MoneyAgePromptContext);
  const ensureMoneyAge = useCallback(async () => {
    if (ctx) return ctx.ensureMoneyAge();
    const latest = await fetchMoneyAge();
    return latest?.allowed === true;
  }, [ctx]);
  const ensureNsfwView = useCallback(async () => {
    if (ctx) return ctx.ensureNsfwView();
    return fetchNsfwAgeAllowed();
  }, [ctx]);
  return { ensureMoneyAge, ensureNsfwView };
}

export function useMoneyAgeGate() {
  const prompt = useMoneyAgePrompt();
  return {
    ready: true,
    blocked: false,
    allowed: true,
    reason: null as MoneyAgeReason | null,
    hasBirthDate: false,
    message: null,
    ensureMoneyAge: prompt.ensureMoneyAge,
    ensureNsfwView: prompt.ensureNsfwView,
  };
}
