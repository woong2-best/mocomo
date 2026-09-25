"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { updateUserLocale } from "@/actions/locale";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";
import { detectBrowserTimeZone, normalizeTimeZone } from "@/lib/i18n/timezone";
import { useLocale } from "@/components/providers/locale-provider";

/** 로그인 시 DB locale/country/timeZone을 클라이언트 상태·쿠키에 동기화 + 기기 TZ */
export function LocaleSessionSync() {
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status;
  const { hydrateFromSession, locale, countryCode } = useLocale();
  const pushedTz = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const nextLocale = normalizeLocale(session.user.locale);
    const country = (session.user.countryCode ?? "KR").toUpperCase();
    const timeZone = normalizeTimeZone(session.user.timeZone);
    if (!isLocale(nextLocale)) return;
    hydrateFromSession(nextLocale, country, timeZone);
  }, [
    session?.user?.locale,
    session?.user?.countryCode,
    session?.user?.timeZone,
    session?.user,
    status,
    hydrateFromSession,
  ]);

  useEffect(() => {
    if (status === "loading" || !status) return;
    const deviceTz = detectBrowserTimeZone();
    if (!deviceTz || pushedTz.current === deviceTz) return;

    if (status !== "authenticated" || !session?.user) {
      pushedTz.current = deviceTz;
      hydrateFromSession(locale, countryCode, deviceTz);
      return;
    }

    const stored = normalizeTimeZone(session.user.timeZone);
    if (stored === deviceTz) {
      pushedTz.current = deviceTz;
      return;
    }

    pushedTz.current = deviceTz;
    const nextLocale = normalizeLocale(session.user.locale ?? locale);
    const country = (session.user.countryCode ?? countryCode ?? "KR").toUpperCase();
    void updateUserLocale({
      locale: nextLocale,
      countryCode: country,
      timeZone: deviceTz,
    }).then(() => {
      hydrateFromSession(nextLocale, country, deviceTz);
      void sessionState?.update?.();
    });
  }, [
    status,
    session?.user,
    session?.user?.timeZone,
    session?.user?.locale,
    session?.user?.countryCode,
    locale,
    countryCode,
    hydrateFromSession,
    sessionState,
  ]);

  return null;
}
