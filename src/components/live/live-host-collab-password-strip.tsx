"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";

const LIVE_PW_KEY = (channelId: string) => `mocomo_live_pw_${channelId}`;

/** 호스트 스튜디오 — 미리보기 아래 합방 비밀번호 */
export function LiveHostCollabPasswordStrip({
  channelId,
  password: passwordProp,
  compact = false,
}: {
  channelId: string;
  password?: string | null;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const [password, setPassword] = useState<string | null>(passwordProp ?? null);

  useEffect(() => {
    if (passwordProp) {
      setPassword(passwordProp);
      return;
    }
    try {
      setPassword(sessionStorage.getItem(LIVE_PW_KEY(channelId)));
    } catch {
      setPassword(null);
    }
  }, [channelId, passwordProp]);

  if (!password) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/35 px-3 py-2 text-amber-950 dark:text-amber-100">
        <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-80" />
        <span className="text-[11px] font-medium opacity-90">{t("live.s1dcrmek")}</span>
        <span className="font-mono text-sm font-bold tracking-[0.2em]">{password}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3">
      <p className="text-xs font-medium text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
        <KeyRound className="h-3.5 w-3.5" />
        {t("live.s1xx2gtr")}
      </p>
      <p className="mt-1.5 text-2xl font-mono font-bold tracking-[0.25em] text-amber-950 dark:text-amber-50">
        {password}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t("live.s140d5ta")}
      </p>
    </div>
  );
}
