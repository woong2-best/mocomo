"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMoneyAgeStatus } from "@/hooks/use-money-age";
import { createTranslator } from "@/lib/i18n/messages";

const t = createTranslator("en");

export function MoneyAgeBanner() {
  const pathname = usePathname() ?? "";
  const { blocked, reason, ready } = useMoneyAgeStatus();

  if (!ready || !blocked) return null;
  if (pathname.startsWith("/auth") || pathname.startsWith("/legal")) return null;

  const missing = reason !== "underage";
  const title = missing ? t("moneyAge.bannerMissingTitle") : t("moneyAge.bannerUnderageTitle");
  const body = missing ? t("moneyAge.bannerMissingBody") : t("moneyAge.bannerUnderageBody");

  return (
    <div
      role="status"
      className="sticky top-0 z-[55] border-b border-amber-900/40 bg-amber-500 text-amber-950 shadow-md"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2 px-4 py-2.5 text-sm leading-relaxed">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-bold">{title}</p>
          <p className="mt-0.5">{body}</p>
          {missing ? (
            <Link
              href="/settings/profile"
              className="mt-1.5 inline-flex rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-black"
            >
              {t("moneyAge.addBirthDate")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
