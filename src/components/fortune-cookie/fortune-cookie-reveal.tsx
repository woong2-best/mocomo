"use client";

import { useState } from "react";
import Link from "next/link";
import { FortuneCookieVisual } from "@/components/fortune-cookie/fortune-cookie-visual";
import type { FortuneCookieDto } from "@/lib/fortune-cookie/service";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  cookie: FortuneCookieDto;
  heading?: string;
};

export function FortuneCookieReveal({ cookie, heading }: Props) {
  const { t } = useLocale();
  const [status, setStatus] = useState<"waiting" | "opening" | "opened">("waiting");

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-10 text-center">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bd8038]">
        {heading ?? t("wallet.topup.paymentSuccess")}
      </p>
      <p className="mb-6 min-h-[1.5rem] text-sm font-semibold text-[#3a2a18]/80">
        {status === "opened" ? t("cookie.opened") : t("cookie.opening")}
      </p>
      <FortuneCookieVisual
        nickname={cookie.nickname}
        serial={cookie.serial}
        fortuneText={cookie.fortuneText}
        mode="auto-open"
        onOpened={() => setStatus("opened")}
      />
      <p className="mt-8 max-w-md text-sm font-semibold text-[#3a2a18]/75">{t("cookie.saved")}</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/fortune-cookies"
          className="rounded-full bg-[#1B3A6B] px-5 py-2.5 text-sm font-bold text-white"
        >
          {t("cookie.openCollection")}
        </Link>
        <Link
          href="/wallet"
          className="rounded-full border border-[#1B3A6B]/30 px-5 py-2.5 text-sm font-bold text-[#1B3A6B]"
        >
          {t("cookie.backWallet")}
        </Link>
      </div>
    </section>
  );
}
