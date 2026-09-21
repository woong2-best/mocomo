"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";
import { normalizeTimeZone } from "@/lib/i18n/timezone";
import { useLocale } from "@/components/providers/locale-provider";

/** 로그인 시 DB locale/country/timeZone을 클라이언트 상태·쿠키에 동기화 */
export function LocaleSessionSync() {
  const { data: session, status } = useSession();
  const { hydrateFromSession } = useLocale();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const locale = normalizeLocale(session.user.locale);
    const country = (session.user.countryCode ?? "KR").toUpperCase();
    const timeZone = normalizeTimeZone(session.user.timeZone);
    if (!isLocale(locale)) return;
    hydrateFromSession(locale, country, timeZone);
  }, [
    session?.user?.locale,
    session?.user?.countryCode,
    session?.user?.timeZone,
    session?.user,
    status,
    hydrateFromSession,
  ]);

  return null;
}
