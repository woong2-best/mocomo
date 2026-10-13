"use client";

import { FortuneCookieVisual } from "@/components/fortune-cookie/fortune-cookie-visual";
import type { FortuneCookieDto } from "@/lib/fortune-cookie/service";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  cookies: FortuneCookieDto[];
};

export function FortuneCookieCollection({ cookies }: Props) {
  const { t } = useLocale();
  if (cookies.length === 0) {
    return (
      <div className="rounded-2xl border border-[#ead9b4] bg-[#fff8ea] px-5 py-10 text-center">
        <p className="text-base font-bold text-[#3a2a18]">{t("cookie.emptyTitle")}</p>
        <p className="mt-2 text-sm text-[#3a2a18]/70">{t("cookie.emptyBody")}</p>
        <a
          href="/wallet"
          className="mt-5 inline-flex rounded-full bg-[#1B3A6B] px-4 py-2 text-sm font-bold text-white"
        >
          {t("tower.emptyTopUp")}
        </a>
      </div>
    );
  }

  return (
    <ul className="grid gap-8 sm:grid-cols-2">
      {cookies.map((cookie) => (
        <li
          key={cookie.id}
          className="flex flex-col items-center rounded-2xl border border-[#ead9b4] bg-[#fffdf7] px-3 py-5"
        >
          <FortuneCookieVisual
            nickname={cookie.nickname}
            serial={cookie.serial}
            fortuneText={cookie.fortuneText}
            mode="opened"
          />
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a5516]">
            {cookie.theme} · {new Date(cookie.createdAt).toLocaleDateString("en-US")}
          </p>
        </li>
      ))}
    </ul>
  );
}
