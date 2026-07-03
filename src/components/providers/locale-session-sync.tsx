"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { isLocale, normalizeLocale } from "@/lib/i18n/config";
import { setClientLocaleCookies } from "@/lib/i18n/client-cookies";

/** 로그인 시 DB locale/country를 클라이언트 쿠키에 동기화 (게스트 en 쿠키가 ko 설정을 덮지 않도록) */
export function LocaleSessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const locale = normalizeLocale(session.user.locale);
    const country = (session.user.countryCode ?? "KR").toUpperCase();
    if (!isLocale(locale)) return;
    setClientLocaleCookies(locale, country);
  }, [session?.user?.locale, session?.user?.countryCode, session?.user, status]);

  return null;
}
