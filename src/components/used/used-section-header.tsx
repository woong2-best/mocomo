"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

/** 서버 컴포넌트 — 탭 링크 prefetch로 전환 가속 */
export function UsedSectionHeader() {
  const { locale } = useLocale();
  const { isNativeApp } = useClientPlatform();

  return (
    <div className="flex items-center justify-between gap-3">
      <h1 className={cn("min-w-0 truncate text-xl font-extrabold", isNativeApp && "sr-only")}>
        {MARKET_BRAND_NAME}
      </h1>
      <nav className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" className="rounded-full border-folk-cobalt/30 font-extrabold text-folk-cobalt" asChild>
          <Link href="/market/my">{uiText(locale, "내 거래", "My listings")}</Link>
        </Button>
      </nav>
    </div>
  );
}
