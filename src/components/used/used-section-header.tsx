"use client";

import Link from "next/link";
import { Heart, ShoppingBag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";


const shortcuts = [
  { href: "/market/my?lane=purchased", labelKey: "market.purchases", icon: ShoppingBag },
  { href: "/market/my?lane=selling", labelKey: "market.sales", icon: DollarSign },
  { href: "/market/my?lane=favorites", labelKey: "market.favorites", icon: Heart },
] as const;

/** 서버 컴포넌트 — 탭 링크 prefetch로 전환 가속 */
export function UsedSectionHeader() {
  const { t } = useLocale();
  const { isNativeApp } = useClientPlatform();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className={cn("min-w-0 truncate text-xl font-extrabold", isNativeApp && "sr-only")}>
        {MARKET_BRAND_NAME}
      </h1>
      <nav className="flex shrink-0 flex-wrap items-center gap-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="inline-flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-center hover:bg-muted/70 min-w-[4.25rem]"
            >
              <Icon className="h-5 w-5 text-folk-cobalt" strokeWidth={1.6} />
              <span className="text-[10px] font-bold leading-tight">
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
        <Button
          size="sm"
          className="rounded-full bg-folk-terracotta font-extrabold text-white hover:bg-folk-terracotta/90 h-9 px-4"
          asChild
        >
          <Link href="/market/new">{t("ui.sell")}</Link>
        </Button>
      </nav>
    </div>
  );
}
